export interface UpdateAdJobInterface {
   type: 'UPDATE_AD';
   data: {
        id: string;
        userId: string;
        price: number;
        seats: number;
        description: string;
   } 
}