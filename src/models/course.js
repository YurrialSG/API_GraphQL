const { Model, DataTypes } = require('sequelize')
const Sequelize = require('../database')
const User = require('./user')

class Course extends Model { 
    static associate() {
        User.hasMany(Course)
        Course.belongsTo(User)
    }
}

Course.init({
    description: DataTypes.STRING,
    duration: DataTypes.STRING,
    initialDate: DataTypes.STRING,
    finalDate: DataTypes.STRING,
}, { sequelize: Sequelize, modelName: 'course' })

Course.associate()

module.exports = Course