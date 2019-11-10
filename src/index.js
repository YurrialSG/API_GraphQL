const { ApolloServer, gql, PubSub } = require('apollo-server')
const Sequelize = require('./database')
const User = require('./models/user')
const Course = require('./models/course')
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
        course: [Course]
    }

    type Course {
        id: ID!
        description: String!
        duration: String!
        initialDate: String!
        finalDate: String!
        user: User!
    }

    type Query {
        allUsers: [User]
        allCourses: [Course]
    }

    type Mutation {
        createUser(data: CreateUserInput): User
        deleteUser(id: ID!): Boolean

        createCourse(data: CreateCourseInput): Course @auth(role: ADMIN)
        deleteCourse(id: ID!): Boolean @auth(role: ADMIN)

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

    input CreateCourseInput {
        description: String!
        duration: String!
        initialDate: String!
        finalDate: String!
        user: createTimerUserInput
    }

    input createTimerUserInput {
        id: ID!
    }

`

const resolver = {
    Query: {
        //listando todos os usuários
        allUsers() {
            return User.findAll({ include: [Course] })
        },
        //listando todos os cursos
        allCourses() {
            return Course.findAll({ include: [User] })
        }
    },
    Mutation: {
        //gerenciando usuários
        async createUser(parent, body, context, info) {
            body.data.password = await bcrypt.hash(body.data.password, 10)
            const user = await User.create(body.data)
            const reloadedUser = user.reload({ include: [Course] })
            return reloadedUser
        },
        async deleteUser(parent, body, context, info) {
            const user = await User.findOne({
                where: { id: body.id }
            })
            if(!user) {
                throw new Error('Usuário não encontrado')
            }
            await user.destroy()
            return true
        },
        //gerenciando cursos
        async createCourse(parent, body, context, info) {
            const course = await Course.create(body.data)
            const reloadedCourse = course.reload({ include: [User] })
            return reloadedCourse
        },
        async deleteCourse(parent, body, context, info) {
            const course = await Course.findOne({
                where: { id: body.id }
            })
            if(!course) {
                throw new Error('Curso não encontrado')
            }
            await course.destroy()
            return true
        },
        //realizando login
        async signin(parent, body, context, info) {
            const user = await User.findOne({
                where: { email: body.email }
            })

            if(user) {
                const isCorrect = await bcrypt.compare(body.password, user.password)
                if(!isCorrect) {
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
    context({ req, connection }) {
        if (connection) {
            return connection.context
        }

        return {
            headers: req.headers,
        }
    }
});


Sequelize.sync().then(() => {
    server.listen()
        .then(() => {
            console.log('Servidor rodando')
        })
})