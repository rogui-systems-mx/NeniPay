export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    stock?: number;
    category?: string;
    image?: string;
}

export interface ProductStore {
    products: Product[];
    loading: boolean;
    addProduct: (name: string, price: number, stock?: number, description?: string, category?: string, image?: string) => void;
    updateProduct: (productId: string, name: string, price: number, stock?: number, description?: string, category?: string, image?: string) => void;
    deleteProduct: (productId: string) => void;
}
