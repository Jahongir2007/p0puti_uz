export type UserJob = {
    type: string
    data: {
        telegramId: string,
        firstName: string,
        lastName: string,
        username: string,
        photoUrl: string
    }
}