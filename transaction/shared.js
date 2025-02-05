import { sleep } from 'k6';
import { registerUser, loginUser } from '../helpers/user.js';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { Counter } from 'k6/metrics';
import { createProduct } from '../helpers/product.js';
import { createTransaction } from '../helpers/transaction.js'; 

export const options = {
    scenarios: {
        productCreate: {
            exec: 'productCreate',
            executor: 'shared-iterations', 
            vus: 10,               
            iterations: 300,       
            maxDuration: '1m',  
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
        fullName: "jyye",
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
    let firstProductGuid = null; 
    
    for (let i = 1; i <= 3; i++) {
        let productGuid = uuidv4().replace(/-/g, '').slice(0, 16);
    
        const PRODUCT_PAYLOAD = {
            storeId: storeId,
            guid: productGuid,
            name: `new-product -> vu_id:_${vuId}_uniqueId:_${uniqueId}_user:_${data.user.id}`,
            price: 2000 + (i * 2000),
            cost: 1000 + (i * 2000),
            parent: i === 1 ? null : parentGuid, 
            category: 1,
        };
    
        const productResponse = createProduct(PRODUCT_PAYLOAD, token);

        if (i === 1 && productResponse.status === 200) {
            parentGuid = productGuid;
            firstProductGuid = productGuid;
        }

        if (productResponse.status === 200) {
            productCounterSuccess.add(1);
        } else {
            productCounterError.add(1);
        }
    }

    sleep(1);

    const transactionGuid = uuidv4().replace(/-/g, '').slice(0, 16);
    const transactionPayload = {
        customerId: 0,
        customer: "string", 
        guid: transactionGuid,
        date: '2024-07-23 13:45:11.950096', 
        invoiceDiscount: 0,
        invoicePpn: 0,
        subTotal: 2000, 
        storeId: storeId,
        details: [
            {
                productGuid: firstProductGuid, 
                transactionGuid: transactionGuid,
                productName: `Product ${firstProductGuid}`,
                qty: 1,
                price: 2000,
                discount: 0,
                ppn: 1000,
                totalPrice: 2000,
            },
        ],
    };

    const transactionResponse = createTransaction(transactionPayload, token);
    console.log(transactionResponse)

    if (transactionResponse.status === 200) {
        console.log('Transaction created successfully');
    } else {
        console.log('Transaction failed');
    }

    sleep(1);
}
