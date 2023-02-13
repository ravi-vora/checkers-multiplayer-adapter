import { validateAuthToken, validateAuthUser, validateNewUser } from "../middlewares/user.middleware.js";
import { User } from "../models/user.model.js";
import { comparePassword, genPassword, issueJWT } from "../helpers/util.helper.js";
export const registerUser = (io, socket, payload) => {
    /**
     * @params payload: { email, password, confirmPassword }
     * @returns not validated { errors -> object }
     * @returns validated { true -> boolean
     * validate user
     */
    const errors = validateNewUser(payload);
    if (typeof errors !== "boolean") {
        socket.emit('user:register:fail', errors);
    }
    else {
        // encrypt the text password and store new-user with hash and salt
        const encryptPassword = genPassword(payload.password);
        User.create({
            email: payload.email,
            socketId: socket.id,
            hash: encryptPassword.hash,
            salt: encryptPassword.salt
        }).then((newUser) => {
            const jwt = issueJWT(newUser.id);
            socket.emit('user:register:success', {
                email: newUser.email,
                token: jwt.token,
                expires: jwt.expires
            });
        }).catch((e) => {
            if (e["errors"]["email"]?.message) {
                socket.emit('user:register:fail', {
                    email: [e["errors"]["email"]?.message]
                });
            }
            else {
                socket.emit('user:register:fail', {
                    general: [e.message]
                });
            }
        });
    }
};
export const loginUser = (io, socket, payload) => {
    /**
     * @params payload: { email, password }
     * @returns not validated { errors -> object }
     * @returns validated { true -> boolean
     * validate user
     */
    const errors = validateAuthUser(payload);
    if (typeof errors !== "boolean") {
        socket.emit('user:login:fail', errors);
    }
    else {
        User.findOneAndUpdate({ email: payload.email }, {
            socketId: socket.id
        }, { new: true })
            .then((user) => {
            if (!user) {
                socket.emit('user:login:fail', {
                    email: ["email is not registered"]
                });
            }
            else {
                // validate password with found users hash and salt
                const isValidPassword = comparePassword(payload.password, user.hash, user.salt);
                if (!isValidPassword) {
                    socket.emit('user:login:fail', {
                        password: ["Wrong password"]
                    });
                }
                else {
                    // password matched -> generate jwt token
                    const jwt = issueJWT(user.id);
                    socket.emit('user:login:success', {
                        email: user.email,
                        token: jwt.token,
                        expires: jwt.expires
                    });
                }
            }
        }).catch((e) => {
            socket.emit('user:login:fail', {
                general: [e.message]
            });
        });
    }
};
export const refreshToken = (io, socket, payload) => {
    validateAuthToken(payload.token, socket.id)
        .then((tokenValidate) => {
        if (!tokenValidate.validate) {
            socket.emit('token:refresh:fail', {
                token: [tokenValidate.message]
            });
        }
        else {
            const jwt = issueJWT(tokenValidate.id);
            socket.emit('token:refresh:success', { ...tokenValidate.user, token: jwt.token, expires: jwt.expires });
        }
    }).catch((e) => {
        socket.emit('token:refresh:fail', {
            general: [e.message]
        });
    });
};
//# sourceMappingURL=user.controller.js.map