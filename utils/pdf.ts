import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { Client } from '../hooks/useNeniStore.types';

/**
 * Generates and shares a PDF with the client's payment history
 * @param client Client object with transactions
 */
export const shareClientHistoryPDF = async (client: Client): Promise<boolean> => {
    try {
        const html = generateHistoryHTML(client);

        if (Platform.OS === 'web') {
            await Print.printAsync({ html });
            return true;
        }

        // Print to a temporary file
        const { uri } = await Print.printToFileAsync({ html });

        // Create a friendlier name in the cache directory
        const fileName = `Historial_${client.name.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        // @ts-ignore
        const cacheDir = FileSystem.cacheDirectory;
        const newUri = `${cacheDir}${fileName}`;

        // Move to the new location with the correct name
        await FileSystem.moveAsync({
            from: uri,
            to: newUri
        });

        // Share the file
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(newUri, {
                mimeType: 'application/pdf',
                dialogTitle: `Historial de ${client.name}`,
                UTI: 'com.adobe.pdf'
            });
            return true;
        } else {
            // Fallback for when sharing is not available
            Alert.alert('PDF Generado', 'El PDF se ha guardado pero no se pudo abrir el menú de compartir.');
            return false;
        }
    } catch (error) {
        console.error('Error in PDF generation:', error);
        Alert.alert('Error', 'No se pudo generar el reporte en este momento.');
        return false;
    }
};

/**
 * Generates HTML content for the client history PDF
 */
const generateHistoryHTML = (client: Client): string => {
    const currentDate = new Date().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Sort transactions by date (oldest first for running balance)
    const sortedOldestFirst = [...client.transactions].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate running balance and store as we go
    let runningBalance = 0;
    const historyWithBalance = sortedOldestFirst.map(t => {
        if (t.type === 'sale') {
            runningBalance += t.amount;
        } else {
            runningBalance -= t.amount;
        }
        return { ...t, balance: runningBalance };
    });

    // Final list for display (newest first)
    const transactionRows = [...historyWithBalance].reverse().map(t => {
        const date = new Date(t.date).toLocaleDateString('es-MX');
        const type = t.type === 'sale' ? 'Venta' : 'Pago';
        const typeColor = t.type === 'sale' ? '#ef4444' : '#10b981';
        const amountSign = t.type === 'sale' ? '+' : '-';

        return `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${date}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    <span style="color: ${typeColor}; font-weight: 600;">${type}</span>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${t.description}</td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: ${typeColor};">
                    ${amountSign}$${t.amount.toLocaleString()}
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
                    $${t.balance.toLocaleString()}
                </td>
            </tr>
        `;
    }).join('');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    padding: 40px;
                    color: #1f2937;
                }
                .header {
                    text-align: center;
                    margin-bottom: 40px;
                    border-bottom: 3px solid #8B5CF6;
                    padding-bottom: 20px;
                }
                .app-name {
                    font-size: 32px;
                    font-weight: 900;
                    color: #8B5CF6;
                    margin-bottom: 8px;
                }
                .document-title {
                    font-size: 18px;
                    color: #4b5563;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .date {
                    font-size: 12px;
                    color: #9ca3af;
                }
                .client-info {
                    background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
                    padding: 24px;
                    border-radius: 12px;
                    margin-bottom: 30px;
                    color: white;
                }
                .client-name {
                    font-size: 24px;
                    font-weight: 800;
                    margin-bottom: 8px;
                }
                .client-details {
                    font-size: 14px;
                    opacity: 0.9;
                }
                .balance-summary {
                    background: #f9fafb;
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 30px;
                    text-align: center;
                }
                .balance-label {
                    font-size: 14px;
                    color: #6b7280;
                    margin-bottom: 8px;
                }
                .balance-amount {
                    font-size: 36px;
                    font-weight: 900;
                    color: ${client.totalBalance > 0 ? '#ef4444' : '#10b981'};
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 30px;
                }
                th {
                    background: #f3f4f6;
                    padding: 12px;
                    text-align: left;
                    font-size: 12px;
                    font-weight: 700;
                    color: #374151;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                th:nth-child(4), th:nth-child(5) {
                    text-align: right;
                }
                .footer {
                    text-align: center;
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    font-size: 12px;
                    color: #9ca3af;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="app-name">NeniPay</div>
                <div class="document-title">Historial de Transacciones</div>
                <div class="date">${currentDate}</div>
            </div>

            <div class="client-info">
                <div class="client-name">${client.name}</div>
                <div class="client-details">
                    ${client.phone ? `📱 ${client.phone}` : ''}
                    ${client.location ? ` • 📍 ${client.location}` : ''}
                    <br>
                    Cliente desde: ${client.memberSince}
                </div>
            </div>

            <div class="balance-summary">
                <div class="balance-label">SALDO ACTUAL</div>
                <div class="balance-amount">$${client.totalBalance.toLocaleString()}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Descripción</th>
                        <th>Monto</th>
                        <th>Saldo</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactionRows}
                </tbody>
            </table>

            <div class="footer">
                <p>Generado por NeniPay</p>
                <p>Hecho con ❤️ para facilitar tu negocio</p>
            </div>
        </body>
        </html>
    `;
};
