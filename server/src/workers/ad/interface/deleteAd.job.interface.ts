export interface DeleteAdJobInterface {
    type: 'DELETE_AD';
    data: {
        id: string;
        userId: string;
    }
}