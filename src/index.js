const { ApolloServer, gql, PubSub } = require('apollo-server')
const Sequelize = require('./database')
const User = require('./models/user')
const Product = require('./models/product')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const AuthDirective = require('./directives/auth')

const pubSub = new PubSub()

const typeDefs = gql`
    enum RoleEnum {
        ADMIN
        USER
    }

    directive @auth(
        role: RoleEnum
    ) on OBJECT | FIELD_DEFINITION
    
    type User {
        id: ID!
        firstname: String!
        lastname: String!
        email: String!
        password: String!
        role: RoleEnum!
    }

    type Product {
        id: ID!
        barcode: String!
        description: String!
        pricekg: String!
        produced: String!
    }

    type Query {
        allUsers: [User] @auth(role: ADMIN)
        allProducts: [Product] 
    }

    type Mutation {
        createUser(data: CreateUserInput): User
        deleteUser(id: ID!): Boolean

        createProduct(data: CreateProductInput): Product @auth(role: ADMIN)
        deleteProduct(id: ID!): Boolean

        signin(
            email: String!
            password: String!
        ): PayloadAuth
    }

    type PayloadAuth  {
        token: String!
        user: User!
    }

    input CreateUserInput {
        firstname: String!
        lastname: String!
        email: String!
        password: String!
        role: RoleEnum!
    }

    input CreateProductInput {
        barcode: String!
        description: String!
        pricekg: String!
        produced: String!
    }

`

const resolver = {
    Query: {
        //listando todos os usuários
        allUsers() {
            return User.findAll()
        },
        //listando todos os cursos
        async allProducts() {
            return Product.findAll()
        }
    },
    Mutation: {
        //gerenciando usuários
        async createUser(parent, body, context, info) {
            body.data.password = await bcrypt.hash(body.data.password, 10)
            const user = await User.create(body.data)
            const reloadedUser = user.reload()
            return reloadedUser
        },
        async deleteUser(parent, body, context, info) {
            const user = await User.findOne({
                where: { id: body.id }
            })
            if (!user) {
                throw new Error('Usuário não encontrado')
            }
            await user.destroy()
            return true
        },
        //gerenciando cursos
        async createProduct(parent, body, context, info) {
            const product = await Product.create(body.data)
            const reloadedProduct = product.reload()
            return reloadedProduct
        },
        async deleteProduct(parent, body, context, info) {
            const product = await Product.findOne({
                where: { id: body.id }
            })
            if (!product) {
                throw new Error('Produto não encontrado')
            }
            await product.destroy()
            return true
        },
        //realizando login
        async signin(parent, body, context, info) {
            const user = await User.findOne({
                where: { email: body.email }
            })

            if (user) {
                const isCorrect = await bcrypt.compare(body.password, user.password)
                if (!isCorrect) {
                    throw new Error('Senha inválida')
                }
                const token = jwt.sign({ id: user.id }, 'secret')

                return {
                    token,
                    user
                }
            }
        }
    }
}

const server = new ApolloServer({
    typeDefs: typeDefs,
    resolvers: resolver,
    schemaDirectives: {
        auth: AuthDirective
    },
    //context: ({ req, res }) => ({req, res})
    async context({ req, connection }) {
        if (connection) {
            return connection.context
        }

        // const token = req.headers.authorization

        // if (token) {
        //     const jwtData = jwt.decode(token.replace('Bearer ', ''))
        //     const { id } = jwtData

        //     return {
        //         headers: req.headers,
        //         user: id
        //     }
        // }

        return {
            headers: req.headers,
        }
    }
});


Sequelize.sync().then(() => {
    server.listen()
        .then(() => {
            console.log(`🚀 Server ready at port http://localhost:4000/api`);
        })
})