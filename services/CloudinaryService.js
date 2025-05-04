// services/CloudinaryService.js
const cloudinary = require('cloudinary').v2;
const { AppError } = require('../errors');

class CloudinaryService {
    constructor() {
        cloudinary.config({
            cloud_name: process.env.cloud_name,
            api_key: process.env.api_key,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true
        });
        console.log('Cloudinary configurado com sucesso');

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
                            console.error('Cloudinary upload error:', error);
                            reject(new AppError('Falha ao fazer upload da imagem', 500));
                        } else {
                            resolve(result);
                        }
                    }
                );

                uploadStream.end(fileBuffer);
            });
        } catch (error) {
            console.error('Error in CloudinaryService.uploadImage:', error);
            throw new AppError('Erro ao processar upload da imagem', 500);
        }
    }

    async deleteImage(publicId) {
        try {
            const result = await cloudinary.uploader.destroy(publicId);
            if (result.result !== 'ok') {
                throw new Error('Failed to delete image');
            }
            return true;
        } catch (error) {
            console.error('Error deleting image from Cloudinary:', error);
            throw new AppError('Erro ao remover imagem', 500);
        }
    }
}

module.exports = new CloudinaryService();