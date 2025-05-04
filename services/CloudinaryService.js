const cloudinary = require('cloudinary').v2;
const { AppError } = require('../errors');

class CloudinaryService {
    constructor() {
        try {
            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET,
                secure: true
            });
            console.log('Cloudinary configurado com sucesso');
        } catch (error) {
            console.error('Erro ao configurar Cloudinary:', error);
            throw new AppError('Erro na configuração do Cloudinary', 500);
        }
    }

    async uploadImage(fileBuffer, options = {}) {
        try {
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'chamados',
                        resource_type: 'auto',
                        ...options
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Erro no upload para Cloudinary:', error);
                            reject(new AppError('Falha ao fazer upload da imagem', 500));
                        } else {
                            console.log('Upload bem-sucedido:', result.secure_url);
                            resolve(result);
                        }
                    }
                );

                uploadStream.end(fileBuffer);
            });
        } catch (error) {
            console.error('Erro no CloudinaryService.uploadImage:', error);
            throw new AppError('Erro ao processar upload da imagem', 500);
        }
    }

    async deleteImage(publicId) {
        try {
            const result = await cloudinary.uploader.destroy(publicId);
            if (result.result !== 'ok') {
                throw new Error('Falha ao deletar imagem');
            }
            return true;
        } catch (error) {
            console.error('Erro ao deletar imagem do Cloudinary:', error);
            throw new AppError('Erro ao remover imagem', 500);
        }
    }
}

module.exports = new CloudinaryService();