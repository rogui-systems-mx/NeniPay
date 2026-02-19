import { useNeniContext } from '../context/NeniContext';

export const useProductStore = () => {
    const context = useNeniContext();
    return {
        products: context.products,
        loading: context.loading,
        addProduct: context.addProduct,
        updateProduct: context.updateProduct,
        deleteProduct: context.deleteProduct,
    };
};
