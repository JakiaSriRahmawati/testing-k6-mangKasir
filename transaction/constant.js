import { sleep } from 'k6';
import { registerUser, loginUser } from '../helpers/user.js';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { Counter } from 'k6/metrics';
import { createProduct } from '../helpers/product.js';
import { createTransaction } from '../helpers/transaction.js'; // Mengimpor fungsi createTransaction

export const options = {
    scenarios: {
        productCreate: {
            exec: 'productCreate',
            executor: 'constant-vus',
            vus: 50,               
            duration: '1m',  
        },
    },
    thresholds: {
        user_registration_counter_success: ['count>200'],
        user_registration_counter_error: ['count<10'],
        user_login_counter_success: ['count>200'],
        user_login_counter_error: ['count<10'],
        user_create_product_counter_success: ['count>90'],
        user_create_product_counter_error: ['count<10'],
    },
};

const registerCounterSuccess = new Counter("user_registration_counter_success");
const registerCounterError = new Counter("user_registration_counter_error");

const loginCounterSuccess = new Counter("user_login_counter_success");
const loginCounterError = new Counter("user_login_counter_error");

const productCounterSuccess = new Counter("user_create_product_counter_success");
const productCounterError = new Counter("user_create_product_counter_error");


export function productCreate() {
    const uniqueId = uuidv4();
    const vuId = __VU; 
    const registerRequest = {
        fullName: "string",
        email: `vu_id_${vuId}_${uniqueId}@hotmail.com`,
        password: 'noekasep@123OK!!',
        retryPassword: 'noekasep@123OK!!',
        role: "Owner",
        storeName: "string"
    };
    const registerResponse = registerUser(registerRequest);
    if (registerResponse.status === 200) {
        registerCounterSuccess.add(1);
    } else {
        registerCounterError.add(1);
    }

    sleep(1);  

    const loginResponse = loginUser({
        email: registerRequest.email,
        password: registerRequest.password,
    });

    let data = loginResponse.json().data;
    let token = data.accessToken;
    let storeId = data.user.stores[0].id; 

    if (loginResponse.status === 200) {
        loginCounterSuccess.add(1);
    } else {
        loginCounterError.add(1);
    }

    sleep(1);
    let parentGuid = null;
    let firstProductGuid = null; // Menyimpan guid produk pertama
    
    for (let i = 1; i <= 3; i++) {
        let productGuid = uuidv4().replace(/-/g, '').slice(0, 16);
    
        const PRODUCT_PAYLOAD = {
            storeId: storeId,
            guid: productGuid,
            name: `just -> vu_id:_${vuId}_uniqueId:_${uniqueId}_user:_${data.user.id}`,
            price: 2000 + (i * 2000),
            cost: 1000 + (i * 2000),
            parent: i === 1 ? null : parentGuid, 
            category: 1,
        };
    
        const productResponse = createProduct(PRODUCT_PAYLOAD, token);

        if (i === 1 && productResponse.status === 200) {
            parentGuid = productGuid;
            firstProductGuid = productGuid; // Menyimpan guid produk pertama
        }

        if (productResponse.status === 200) {
            productCounterSuccess.add(1);
        } else {
            productCounterError.add(1);
        }
    }

    sleep(1);

    // Membuat transaksi setelah produk berhasil dibuat
    const transactionGuid = uuidv4().replace(/-/g, '').slice(0, 16);
    const transactionPayload = {
        customerId: 0,
        customer: "string", // opsional, jika ingin tampil di transaksi
        guid: transactionGuid,
        date: new Date().toISOString().slice(0, 23).replace('T', ' '), // format yyyy-MM-dd HH:mm:ss.SSSSSS
        invoiceDiscount: 0,
        invoicePpn: 0,
        subTotal: 60000, // Sesuaikan dengan harga produk
        storeId: storeId,
        details: [
            {
                productGuid: firstProductGuid, // Menggunakan produk pertama yang dibuat
                transactionGuid: transactionGuid,
                productName: `Product ${firstProductGuid}`,
                qty: 1,
                price: 2000,
                discount: 0,
                ppn: 0,
                totalPrice: 2000,
            },
        ],
    };

    const transactionResponse = createTransaction(transactionPayload, token);

    if (transactionResponse.status === 200) {
        console.log('Transaction created successfully');
    } else {
        console.log('Transaction failed');
    }

    sleep(1);
}
