const ExcelJS = require('exceljs');
const db = require('../config/db');
const { parseISO } = require('date-fns');

class ExportController {
    static async exportToExcel(req, res) {
        try {
            const { id_funcionario, mes, ano } = req.query;

            // Validação dos parâmetros
            if (!id_funcionario || !mes || !ano) {
                return res.status(400).json({
                    error: 'Parâmetros obrigatórios ausentes',
                    details: {
                        id_funcionario: !id_funcionario ? 'ID do funcionário é obrigatório' : 'OK',
                        mes: !mes ? 'Mês é obrigatório (1-12)' : 'OK',
                        ano: !ano ? 'Ano é obrigatório (ex: 2024)' : 'OK'
                    }
                });
            }

            // Conversão e validação dos parâmetros
            const idFunc = parseInt(id_funcionario);
            const month = parseInt(mes);
            const year = parseInt(ano);

            if (isNaN(idFunc) ){
                return res.status(400).json({ error: 'ID do funcionário deve ser um número' });
            }

            if (isNaN(month) || month < 1 || month > 12) {
                return res.status(400).json({ error: 'Mês inválido (deve ser entre 1 e 12)' });
            }

            if (isNaN(year)) {
                return res.status(400).json({ error: 'Ano inválido' });
            }

            // Consulta ao banco de dados
            let dbResults;
            try {
                const [rows] = await db.query(
                    `CALL SP_EXPORTAR_DADOS_MENSAL(?, ?, ?)`,
                    [idFunc, month, year]
                );

                console.log('Resultado da procedure:', JSON.stringify(rows, null, 2));

                if (!Array.isArray(rows) || rows.length === 0 || !rows[0]) {
                    return res.status(404).json({ 
                        error: 'Nenhum dado encontrado para o período selecionado',
                        suggestion: 'Verifique se o funcionário possui registros no mês/ano especificado'
                    });
                }

                dbResults = rows;
            } catch (dbError) {
                console.error('Erro no banco de dados:', dbError);
                return res.status(500).json({
                    error: 'Falha ao acessar os dados',
                    details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
                });
            }

            // Criação do arquivo Excel
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Sistema de Ponto';
            workbook.created = new Date();

            try {
                // Configuração das abas
                const sheetConfigs = ExportController.prepareSheetConfigs(dbResults);

                // Criação das abas
                for (const config of sheetConfigs) {
                    if (!config.data || config.data.length === 0) {
                        console.warn(`Nenhum dado para a aba: ${config.name}`);
                        continue;
                    }

                    const worksheet = workbook.addWorksheet(config.name);
                    ExportController.addDataToWorksheet(worksheet, config);
                }

                if (workbook.worksheets.length === 0) {
                    return res.status(404).json({
                        error: 'Nenhum dado disponível para exportação'
                    });
                }

                // Configuração do cabeçalho de resposta
                const fileName = ExportController.generateFileName(dbResults[0], month, year);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
                res.setHeader('Cache-Control', 'no-store');

                // Envio do arquivo
                await workbook.xlsx.write(res);
                return res.end();

            } catch (excelError) {
                console.error('Erro ao gerar Excel:', excelError);
                return res.status(500).json({
                    error: 'Falha ao gerar arquivo Excel',
                    details: process.env.NODE_ENV === 'development' ? excelError.message : undefined
                });
            }

        } catch (error) {
            console.error('Erro inesperado:', error);
            return res.status(500).json({
                error: 'Erro interno no servidor',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    static prepareSheetConfigs(dbResults) {
        if (!dbResults || dbResults.length === 0) {
            return [];
        }

        // Normaliza os resultados
        const dadosFuncionario = Array.isArray(dbResults[0]) ? dbResults[0] : [dbResults[0]];

        // Configuração da aba do Excel
        return [
            {
                name: 'Funcionário',
                data: dadosFuncionario,
                columns: [
                    { header: 'Empresa', key: 'empresa_nome', width: 25 },
                    { header: 'CNPJ', key: 'empresa_cnpj', width: 20 },
                    { header: 'ID Funcionário', key: 'funcionario_id', width: 15 },
                    { header: 'Nome', key: 'funcionario_nome', width: 30 },
                    { header: 'Email', key: 'funcionario_email', width: 25 },
                    { header: 'CPF', key: 'funcionario_cpf', width: 15 },
                    { header: 'Matrícula', key: 'funcionario_matricula', width: 15 },
                    { header: 'Função', key: 'funcionario_funcao', width: 25 },
                    { header: 'Departamento', key: 'funcionario_departamento', width: 20 },
                    { header: 'Admissão', key: 'funcionario_admissao', width: 15 },
                    { header: 'Contrato', key: 'funcionario_contrato', width: 15 },
                    { header: 'Jornada Diária', key: 'jornada_diaria', width: 15 },
                    { header: 'Jornada Semanal', key: 'jornada_semanal', width: 15 }
                ]
            }
        ].filter(sheet => sheet.data && sheet.data.length > 0);
    }

    static addDataToWorksheet(worksheet, config) {
        if (!config.data || config.data.length === 0) return;

        // Configura colunas
        worksheet.columns = config.columns || 
            Object.keys(config.data[0]).map(header => ({
                header: ExportController.formatHeader(header),
                key: header,
                width: ExportController.calculateColumnWidth(header)
            }));

        // Adiciona linhas
        config.data.forEach(row => {
            const processedRow = {};
            for (const key in row) {
                processedRow[key] = ExportController.processCellValue(row[key]);
            }
            worksheet.addRow(processedRow);
        });

        // Aplica estilos
        ExportController.applyStyles(worksheet);
    }

    static processCellValue(value) {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            return parseISO(value);
        }
        return value;
    }

    static formatHeader(header) {
        return header.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    static calculateColumnWidth(header) {
        const baseWidth = header.length;
        return Math.min(Math.max(baseWidth * 1.3, 10), 50);
    }

    static applyStyles(worksheet) {
        if (worksheet.rowCount < 1) return;

        const headerRow = worksheet.getRow(1);
        headerRow.font = {
            bold: true,
            color: { argb: 'FFFFFFFF' },
            size: 12
        };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2F75B5' }
        };
        headerRow.alignment = {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true
        };

        worksheet.views = [{ state: 'frozen', ySplit: 1 }];

        worksheet.eachRow({ includeEmpty: false }, (row) => {
            row.eachCell({ includeEmpty: false }, (cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                    right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                };

                cell.alignment = {
                    vertical: 'middle',
                    horizontal: 'left',
                    wrapText: true
                };

                if (cell.value instanceof Date) {
                    cell.numFmt = 'dd/mm/yyyy hh:mm';
                }
            });
        });
    }

    static generateFileName(funcionarioData, month, year) {
        const nome = funcionarioData?.funcionario_nome 
            ? funcionarioData.funcionario_nome.replace(/\s+/g, '_')
            : 'funcionario';
        
        const mesFormatado = month.toString().padStart(2, '0');
        return `espelho_${nome}_${mesFormatado}_${year}.xlsx`;
    }
}

module.exports = ExportController;