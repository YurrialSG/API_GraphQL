const { Model, DataTypes } = require('sequelize')
const Sequelize = require('../database')

class Product extends Model { }

Product.init({
    barcode: DataTypes.STRING,
    description: DataTypes.STRING,
    pricekg: DataTypes.STRING,
    produced: DataTypes.STRING,
}, { sequelize: Sequelize, modelName: 'product' })

module.exports = Product