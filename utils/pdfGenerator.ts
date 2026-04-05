import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
<<<<<<< HEAD
import { Platform } from 'react-native';
=======
>>>>>>> 4de98df (Fixing Catalog PDF (Images & Filename) and Native Refinements)
import { Product } from '../hooks/useProductStore.types';

const escapeHtml = (unsafe: string) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

/**
 * Optimizes an image and returns its Base64 string.
<<<<<<< HEAD
=======
 * This ensures the image renders in the PDF (via data URI) 
 * without causing memory issues by limiting resolution and quality.
>>>>>>> 4de98df (Fixing Catalog PDF (Images & Filename) and Native Refinements)
 */
const getOptimizedBase64 = async (uri: string): Promise<string | null> => {
    if (!uri) return null;
    
    try {
<<<<<<< HEAD
=======
        // First download if it's remote
>>>>>>> 4de98df (Fixing Catalog PDF (Images & Filename) and Native Refinements)
        let localUri = uri;
        let isTempFile = false;

        if (uri.startsWith('http')) {
<<<<<<< HEAD
            // For web, we might not be able to use FileSystem.downloadAsync easily
            // But Expo Web usually handles remote URLs in ImageManipulator if CORS allows
            // However, to be safe and consistent:
            if (Platform.OS === 'web') {
                localUri = uri; // Use remote URL directly for manipulation on web
            } else {
                const cleanUrl = uri.split('?')[0];
                const extension = cleanUrl.split('.').pop()?.toLowerCase() || 'jpg';
                const cacheDir = FileSystem.cacheDirectory;
                const tempPath = `${cacheDir}temp_orig_${Date.now()}.${extension}`;
                
                const downloadResult = await FileSystem.downloadAsync(uri, tempPath);
                if (downloadResult.status !== 200) return null;
                localUri = downloadResult.uri;
                isTempFile = true;
            }
        }

        const manipulatedImage = await ImageManipulator.manipulateAsync(
            localUri,
            [{ resize: { width: 400 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        if (isTempFile && Platform.OS !== 'web') {
=======
            const cleanUrl = uri.split('?')[0];
            const extension = cleanUrl.split('.').pop()?.toLowerCase() || 'jpg';
            const cacheDir = FileSystem.cacheDirectory;
            const tempPath = `${cacheDir}temp_orig_${Date.now()}.${extension}`;
            
            const downloadResult = await FileSystem.downloadAsync(uri, tempPath);
            if (downloadResult.status !== 200) return null;
            localUri = downloadResult.uri;
            isTempFile = true;
        } else if (!uri.startsWith('file://') && !uri.startsWith('content://') && !uri.startsWith('data:')) {
            // Add file:// prefix if missing for local paths
            localUri = `file://${uri}`;
        }

        // Manipulate the image: resize to max 400px width/height and compress
        const manipulatedImage = await ImageManipulator.manipulateAsync(
            localUri,
            [{ resize: { width: 400 } }], // Resize width to 400px (aspect ratio preserved)
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        // Cleanup the temp download file if it exists
        if (isTempFile) {
>>>>>>> 4de98df (Fixing Catalog PDF (Images & Filename) and Native Refinements)
            try { await FileSystem.deleteAsync(localUri); } catch (e) {}
        }

        return `data:image/jpeg;base64,${manipulatedImage.base64}`;
    } catch (error) {
        console.warn(`Error processing image for PDF (${uri}):`, error);
        return null; // Fallback to placeholder
    }
};

export const generateCatalogPDF = async (products: Product[], businessName: string) => {
<<<<<<< HEAD
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const formattedDate = `${day}_${month}_${year}`;
    const fileName = `catalogo_${formattedDate}.pdf`;

    const activeProducts = products.filter(p => !p.stock || p.stock > 0);
=======
    // Generate filename with date: catalogo_YYYY-MM-DD.pdf
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    const fileName = `catalogo_${formattedDate}.pdf`;

    // Filter out products without stock if desired (previously implemented)
    const activeProducts = products.filter(p => !p.stock || p.stock > 0);

    // Pre-process images sequentially to avoid memory pressure
>>>>>>> 4de98df (Fixing Catalog PDF (Images & Filename) and Native Refinements)
    const processedProducts = [];
    
    for (const p of activeProducts) {
        const base64 = p.image ? await getOptimizedBase64(p.image) : null;
<<<<<<< HEAD
=======
        
>>>>>>> 4de98df (Fixing Catalog PDF (Images & Filename) and Native Refinements)
        processedProducts.push({
            ...p,
            name: escapeHtml(p.name),
            description: p.description ? escapeHtml(p.description) : '',
            base64
        });
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Catálogo - ${businessName}</title>
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #1e293b; background-color: #ffffff; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
          .business-name { font-size: 28px; font-weight: bold; color: #2563eb; text-transform: uppercase; margin: 0; }
          .catalog-title { font-size: 16px; color: #64748b; margin-top: 5px; }
          .product-grid { display: flex; flex-wrap: wrap; gap: 2%; justify-content: flex-start; }
          .product-card { width: 31%; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; margin-bottom: 15px; page-break-inside: avoid; box-sizing: border-box; }
          .product-image { width: 100%; height: 120px; object-fit: cover; border-radius: 8px; background-color: #f1f5f9; margin-bottom: 8px; }
          .product-placeholder { width: 100%; height: 120px; display: flex; align-items: center; justify-content: center; background-color: #f1f5f9; border-radius: 8px; margin-bottom: 8px; color: #94a3b8; font-size: 40px; }
          .product-name { font-size: 14px; font-weight: bold; margin: 0 0 5px 0; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .product-price { font-size: 16px; font-weight: bold; color: #2563eb; margin-bottom: 5px; }
          .product-description { font-size: 10px; color: #64748b; line-height: 1.3; height: 2.6em; overflow: hidden; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; }
          @media print { .product-card { display: inline-block; vertical-align: top; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="business-name">${businessName}</h1>
          <p class="catalog-title">Catálogo Oficial de Productos</p>
        </div>
        <div class="product-grid">
          ${processedProducts.map(product => `
            <div class="product-card">
              ${product.base64 ? 
                `<img src="${product.base64}" class="product-image" />` : 
                `<div class="product-placeholder">📦</div>`
              }
              <h2 class="product-name">${product.name}</h2>
              <div class="product-price">$${product.price.toLocaleString()}</div>
              <p class="product-description">${product.description || ''}</p>
            </div>
          `).join('')}
        </div>
        <div class="footer">
          Generado automáticamente por NeniPay el ${new Date().toLocaleDateString()}<br>
          <em>¡Gracias por tu preferencia!</em>
        </div>
      </body>
    </html>
    `;

    try {
<<<<<<< HEAD
        if (Platform.OS === 'web') {
            await Print.printAsync({ html: htmlContent });
        } else {
            const { uri } = await Print.printToFileAsync({ 
                html: htmlContent,
                width: 595,
                height: 842
            });

            const pdfPath = `${FileSystem.cacheDirectory}${fileName}`;
            await FileSystem.moveAsync({ from: uri, to: pdfPath });

            await Sharing.shareAsync(pdfPath, {
                mimeType: 'application/pdf',
                dialogTitle: `Catálogo - ${businessName}`,
                UTI: 'com.adobe.pdf'
            });
        }
=======
        const { uri } = await Print.printToFileAsync({ 
            html: htmlContent,
            width: 595,
            height: 842
        });

        // Rename the file to the desired catalogo_DD_MM_AAAA.pdf format
        const pdfPath = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.moveAsync({
            from: uri,
            to: pdfPath
        });

        await Sharing.shareAsync(pdfPath, {
            mimeType: 'application/pdf',
            dialogTitle: `Catálogo - ${businessName}`,
            UTI: 'com.adobe.pdf'
        });
>>>>>>> 4de98df (Fixing Catalog PDF (Images & Filename) and Native Refinements)
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};
