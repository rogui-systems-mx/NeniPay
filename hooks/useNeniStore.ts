import { NeniContextType, useNeniContext } from '../context/NeniContext';

export const useNeniStore = (): NeniContextType => {
    return useNeniContext();
};
