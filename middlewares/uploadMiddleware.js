const multer = require('multer');
const { AppError } = require('../errors');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
    };

    if (!allowedTypes[file.mimetype]) {
      return cb(new AppError('Tipo de arquivo não suportado', 400), false);
    }

    cb(null, true);
  }
});

module.exports = upload;