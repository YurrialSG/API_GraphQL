const { Model, DataTypes } = require('sequelize')
const Sequelize = require('../database')
const User = require('./user')

class Product extends Model { 
    static associate() {
        User.hasMany(Product)
        Product.belongsTo(User)
    }
 }

Product.init({
    barcode: DataTypes.STRING,
    description: DataTypes.STRING,
    pricekg: DataTypes.STRING,
    produced: DataTypes.STRING,
}, { sequelize: Sequelize, modelName: 'product' })

Product.associate()

module.exports = Product