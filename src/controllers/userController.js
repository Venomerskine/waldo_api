// Receive user details and create user. 
export const createUser = async (req, res) => {
    try {
        const email = req.body.email
        const password = req.body.password

        console.log("email: ", email)
        console.log("Password: ", password)
    } catch(err) {
        console.error("Error creating user: ", err)
    }
}