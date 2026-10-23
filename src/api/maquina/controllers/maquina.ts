/**
 * maquina controller
 */

import { factories } from '@strapi/strapi';
import * as soap from 'soap';

// URL pública del contrato WSDL del servicio SOAP
const WSDL_URL = 'https://www.dataaccess.com/webservicesserver/NumberConversion.wso?WSDL';


// Función encargada de hablar con el servicio externo
const convertirNumeroALetrasSOAP = async (numero: number | undefined | null): Promise<string> => {
    if (numero === undefined || numero === null) return 'Monto no especificado';

    try {
        const client = await soap.createClientAsync(WSDL_URL);
        const [result] = await client.NumberToWordsAsync({ ubiNum: Number(numero) });

        if (result && result.NumberToWordsResult) {
            return result.NumberToWordsResult.trim();
        }
        return 'No se pudo procesar la conversión';
    } catch (error: any) {
        console.error('Error conectando al WS SOAP externo:', error.message);
        return 'Servicio SOAP temporalmente inactivo';
    }
};

// Función que inyecta el dato en el objeto de la máquina
const enriquecerMaquinaConSOAP = async (item: any) => {
    if (!item) return item;

    const precio = item.precio_alquiler;
    const precioEnLetras = await convertirNumeroALetrasSOAP(precio);

    item.precio_en_letras = precioEnLetras;

    return item;
}


export default factories.createCoreController('api::maquina.maquina', ({ strapi }) => ({

    async findOne(ctx) {
        const response = await super.findOne(ctx);
        if (response && response.data) {
            response.data = await enriquecerMaquinaConSOAP(response.data);
        }

        return response;
    },

    async find(ctx) {
        const response = await super.find(ctx);
        if (response && Array.isArray(response.data)) {
            response.data = await Promise.all(
                response.data.map((maquina: any) => enriquecerMaquinaConSOAP(maquina))
            );
        }
        return response;
    }
}));