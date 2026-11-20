export type TelegramEventJob =
    | {
          type: 'AD_DUPLICATE';
          data: { telegramId: string; from: string; to: string; date: string; time: string; arrivalTime: string };
      }
    | {
          type: 'AD_CREATED';
          data: { telegramId: string; adId: string; from: string; to: string; date: string; time: string };
      }
    | {
        type: 'AD_TOO_CLOSE',
        data: { telegramId: string; from: string; to: string; date: string; time: string }
    }
    | {
        type: 'AD_IN_PAST',
        data: { telegramId: string, from: string, to: string, date: string, time: string }
    }
    | {
        type: 'USER_CREATED',
        data: { telegramId: string }
    }