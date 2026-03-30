import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Product } from '../hooks/useProductStore.types';

export const generateCatalogPDF = async (products: Product[], businessName: string) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Catálogo - ${businessName}</title>
        <style>
          body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            padding: 40px;
            color: #1e293b;
            background-color: #ffffff;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .business-name {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            text-transform: uppercase;
            margin: 0;
          }
          .catalog-title {
            font-size: 16px;
            color: #64748b;
            margin-top: 5px;
          }
          .product-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 2%; /* small gap between items */
            justify-content: flex-start;
          }
          .product-card {
            width: 31%; /* 3 items per row approx */
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 10px;
            margin-bottom: 15px;
            page-break-inside: avoid;
            box-sizing: border-box;
          }
          .product-image {
            width: 100%;
            height: 120px;
            object-fit: cover;
            border-radius: 8px;
            background-color: #f1f5f9;
            margin-bottom: 8px;
          }
          .product-placeholder {
            width: 100%;
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f1f5f9;
            border-radius: 8px;
            margin-bottom: 8px;
            color: #94a3b8;
            font-size: 40px;
          }
          .product-name {
            font-size: 14px;
            font-weight: bold;
            margin: 0 0 5px 0;
            color: #0f172a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .product-price {
            font-size: 16px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
          }
          .product-description {
            font-size: 10px;
            color: #64748b;
            line-height: 1.3;
            height: 2.6em; /* max 2 lines approx */
            overflow: hidden;
          }
          .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            padding-top: 20px;
          }
          @media print {
            .product-card {
               display: inline-block;
               vertical-align: top;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="business-name">${businessName}</h1>
          <p class="catalog-title">Catálogo Oficial de Productos</p>
        </div>

        <div class="product-grid">
          ${products.map(product => `
            <div class="product-card">
              ${product.image ? 
                `<img src="${product.image}" class="product-image" />` : 
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
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Catálogo - ${businessName}`,
            UTI: 'com.adobe.pdf'
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};
