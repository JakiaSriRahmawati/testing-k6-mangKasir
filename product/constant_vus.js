import { check, sleep } from 'k6';
import { registerUser, loginUser } from '../helpers/user.js';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { Counter } from 'k6/metrics';
import { createProduct } from '../helpers/product.js';

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
    // console.log(storeId)

    if (loginResponse.status === 200) {
        loginCounterSuccess.add(1);
    } else {
        loginCounterError.add(1);
    }


    sleep(1);
    const PRODUCT_PAYLOAD = {
        storeId: storeId,
        guid: uniqueId.replace(/-/g, '').slice(0, 16),
        name: `vu_id:_${vuId}_uniqueId:_${uniqueId}_user:_${data.user.id}`,
        price: 10000,
        cost: 5000,
        category: 1,
    };

    const productResponse = createProduct(PRODUCT_PAYLOAD, token);
    if (productResponse.status === 200) {
        productCounterSuccess.add(1);
    } else {
        productCounterError.add(1);
    }

    sleep(1);
}
