import { Gettable } from '../Gettable';

const getter: Gettable<number> = {
  get(): number {
    return 1;
  },
};

export const value = getter.get();
