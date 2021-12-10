export type AuthRule = {
    signUp?: {
        username: string,
        password: string,
        email?: string
    },
    signIn?: {
        username: string,
        password: string,
    },
    reset?: string
};
