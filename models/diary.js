'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Diary extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Diary.init({
    user_id: DataTypes.INTEGER,
    title: DataTypes.STRING,
    content: DataTypes.STRING,
    photo1: DataTypes.BLOB,
    photo2: DataTypes.BLOB,
    photo3: DataTypes.BLOB
  }, {
    sequelize,
    modelName: 'Diary',
  });
  return Diary;
};