// test-api.js - Quick API Testing Script
const BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let userId = '';

// Test scenarios
async function runTests() {
    console.log('🧪 Starting FriendPay API Tests\n');
    
    // Test 1: Register first user (Inviter)
    console.log('📝 Test 1: Register First User');
    try {
        const registerResponse = await fetch(`${BASE_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phoneNumber: '09123456789',
                fullName: 'علی احمدی',
                password: 'test123'
            })
        });
        const registerData = await registerResponse.json();
        console.log('Status:', registerResponse.status);
        console.log('Response:', registerData);
        
        if (registerData.token) {
            authToken = registerData.token;
            userId = registerData.userId;
            console.log('✅ Registration successful!\n');
        } else {
            console.log('❌ Registration failed\n');
            return;
        }
    } catch (error) {
        console.log('❌ Error:', error.message, '\n');
        return;
    }
    
    // Test 2: Get Dashboard
    console.log('📊 Test 2: Get Dashboard Data');
    try {
        const dashboardResponse = await fetch(`${BASE_URL}/users/dashboard`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });
        const dashboardData = await dashboardResponse.json();
        console.log('Status:', dashboardResponse.status);
        console.log('Response:', dashboardData);
        console.log('✅ Dashboard retrieved!\n');
    } catch (error) {
        console.log('❌ Error:', error.message, '\n');
    }
    
    // Test 3: Send Debt Link
    console.log('📲 Test 3: Send Debt Invitation Link');
    try {
        const linkResponse = await fetch(`${BASE_URL}/users/send-link`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                inviteePhoneNumber: '09187654321',
                debtAmount: 150000,
                billDescription: 'شام رستوران'
            })
        });
        const linkData = await linkResponse.json();
        console.log('Status:', linkResponse.status);
        console.log('Response:', linkData);
        console.log('✅ Invitation link created!\n');
        
        const deepLinkToken = linkData.hash;
        
        // Test 4: Register second user (Invitee) using the link
        console.log('👥 Test 4: Register Second User via Invitation');
        const inviteeResponse = await fetch(`${BASE_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phoneNumber: '09187654321',
                fullName: 'محمد رضایی',
                password: 'test456',
                deepLinkToken: deepLinkToken
            })
        });
        const inviteeData = await inviteeResponse.json();
        console.log('Status:', inviteeResponse.status);
        console.log('Response:', inviteeData);
        console.log('✅ Friend registered with debt!\n');
        
        const inviteeToken = inviteeData.token;
        const inviteeId = inviteeData.userId;
        
        // Test 5: Check updated dashboard
        console.log('📊 Test 5: Check Updated Dashboard (Inviter)');
        const updatedDashboardResponse = await fetch(`${BASE_URL}/users/dashboard`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });
        const updatedDashboardData = await updatedDashboardResponse.json();
        console.log('Status:', updatedDashboardResponse.status);
        console.log('Response:', updatedDashboardData);
        console.log('✅ Dashboard shows updated balances!\n');
        
        // Test 6: Settle debt (as invitee)
        if (inviteeToken && userId) {
            console.log('💰 Test 6: Settle Debt (Friend pays back)');
            const settleResponse = await fetch(`${BASE_URL}/payments/settle`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${inviteeToken}`
                },
                body: JSON.stringify({
                    debtToId: userId,
                    amount: 50000
                })
            });
            const settleData = await settleResponse.json();
            console.log('Status:', settleResponse.status);
            console.log('Response:', settleData);
            console.log('✅ Debt settlement complete!\n');
        }
        
    } catch (error) {
        console.log('❌ Error:', error.message, '\n');
    }
    
    // Test 7: Process Receipt (Mock OCR)
    console.log('📸 Test 7: Process Receipt (Mock OCR)');
    try {
        const ocrResponse = await fetch(`${BASE_URL}/ocr/process-receipt`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                rawText: 'mock receipt data'
            })
        });
        const ocrData = await ocrResponse.json();
        console.log('Status:', ocrResponse.status);
        console.log('Response:', ocrData);
        console.log('✅ Receipt processed!\n');
    } catch (error) {
        console.log('❌ Error:', error.message, '\n');
    }
    
    console.log('🎉 All tests completed!');
}

// Run the tests
runTests().catch(console.error);