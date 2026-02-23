export type Result<T> =
    | {
          isSuccess: true;
          value: T;
      }
    | {
          isSuccess: false;
          error: string;
      };

export const ok = <T>(value: T): Result<T> => ({ isSuccess: true, value });
export const fail = <T = never>(error: string): Result<T> => ({ isSuccess: false, error });
