const User = require('./user');
const File = require('./file');
const Folder = require('./folder');
const SharedItem = require('./sharedItem');
const UserVerify = require('./userVerification');

// User <-> Folder
User.hasMany(Folder, { foreignKey: 'ownerId' });
Folder.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });

// User <-> File
User.hasMany(File, { foreignKey: 'ownerId' });
File.belongsTo(User, { as: 'owner', foreignKey: 'ownerId' });

// Folder <-> Folder (self-referencing)
Folder.belongsTo(Folder, { foreignKey: 'parentFolderId', as: 'parentFolder' });
Folder.hasMany(Folder, { foreignKey: 'parentFolderId', as: 'subFolders' });

// File <-> Folder
File.belongsTo(Folder, { foreignKey: 'parentFolderId', as: 'parentFolder' });

module.exports = { User, File, Folder, SharedItem, UserVerify };
