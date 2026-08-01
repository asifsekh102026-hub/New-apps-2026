
// ==========================================
// ০. ফায়ারবেস ইম্পোর্ট ও কনফিগারেশন (Firebase Setup)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// আপনার প্রদত্ত Firebase কনফিগারেশন
const firebaseConfig = {
    apiKey: "AIzaSyCBPjgL6MuTSsqfrOH-PwwbU2bj1l4UL0M",
    authDomain: "nbtbr-b67c2.firebaseapp.com",
    databaseURL: "https://nbtbr-b67c2-default-rtdb.firebaseio.com",
    projectId: "nbtbr-b67c2",
    storageBucket: "nbtbr-b67c2.firebasestorage.app",
    messagingSenderId: "835471865300",
    appId: "1:835471865300:web:6fcfb66e29bfc97f4a9241",
    measurementId: "G-Q7BN12BLP9"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==========================================
// ৪-ডিজিটের সেশন কোড সিস্টেম (4-Digit Session Code)
// ==========================================
let sessionCode = localStorage.getItem('sessionCode');
if (!sessionCode || sessionCode.length !== 4) {
    sessionCode = prompt("আপনার ৪-সংখ্যার সেশন পিন/কোড লিখুন (যেমন: 1234):");
    if (!sessionCode || sessionCode.length !== 4) {
        sessionCode = Math.floor(1000 + Math.random() * 9000).toString();
        alert(`নতুন ৪-ডিজিটের সেশন কোড তৈরি হয়েছে: ${sessionCode}`);
    }
    localStorage.setItem('sessionCode', sessionCode);
}

// Firebase paths using session code
const PARTIES_REF = `sessions/${sessionCode}/parties`;
const PRODUCTS_REF = `sessions/${sessionCode}/products`;
const BILLS_REF = `sessions/${sessionCode}/billsHistory`;
const MAPPINGS_REF = `sessions/${sessionCode}/banglaMappings`;

// Global State
let parties = [];
let products = [];
let billsHistory = [];
let banglaMappings = {};

let editPartyKey = null;
let editProductKey = null;
let editBillKey = null;

// ==========================================
// ১. পেজ নেভিগেশন এবং একটিভ ক্লাস সিস্টেম
// ==========================================
let pages = document.querySelectorAll(".content");
let navLinks = document.querySelectorAll(".nav-link");

function showPage(pageId) {
    let targetPage = document.getElementById(pageId);
    if (!targetPage) return; 

    pages.forEach(page => page.style.display = "none");
    targetPage.style.display = "block";

    navLinks.forEach(link => {
        if(link.getAttribute('href') === `#${pageId}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    if (pageId === 'api') {
        renderApiPageTable();
    }
}

showPage("dashboard");

navLinks.forEach(link => {
    link.onclick = function(e) {
        e.preventDefault();
        let targetId = this.getAttribute('href').substring(1);
        showPage(targetId);
    }
});

function capitalizeText(text) {
    if(!text) return "";
    return text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function formatMRP(mrpValue) {
    if (!mrpValue || mrpValue === "0" || parseFloat(mrpValue) === 0) {
        return "-";
    }
    return mrpValue;
}

function updateDashboardCounts() {
    if(document.getElementById('partyCount')) document.getElementById('partyCount').innerText = parties.length;
    if(document.getElementById('storageCount')) document.getElementById('storageCount').innerText = products.length;
    if(document.getElementById('billCount')) document.getElementById('billCount').innerText = billsHistory.length;
}

// ==========================================
// ফায়ারবেস ডাটা সিঙ্ক (Realtime Listeners)
// ==========================================
onValue(ref(db, PARTIES_REF), (snapshot) => {
    const data = snapshot.val();
    parties = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
    renderParties();
});

onValue(ref(db, PRODUCTS_REF), (snapshot) => {
    const data = snapshot.val();
    products = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
    renderProducts();
});

onValue(ref(db, BILLS_REF), (snapshot) => {
    const data = snapshot.val();
    billsHistory = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
    renderBillsHistoryTable();
});

onValue(ref(db, MAPPINGS_REF), (snapshot) => {
    banglaMappings = snapshot.val() || {};
    renderApiPageTable();
});

// ==========================================
// ২. ভাষা ও অটো অনুবাদ সিস্টেম (Translation)
// ==========================================
let currentLanguage = 'EN'; 
let translationCache = {};  

window.toggleLanguage = async function() {
    currentLanguage = (currentLanguage === 'EN') ? 'BN' : 'EN';
    
    const btn = document.getElementById('langToggleBtn');
    if (btn) btn.innerText = `Translate: ${currentLanguage}`;

    if (currentLanguage === 'BN') {
        if (btn) btn.innerText = "Translating...";
        await autoTranslateCurrentBillItems();
        if (btn) btn.innerText = `Translate: ${currentLanguage}`;
    }

    let finalPage = document.getElementById('final-bill-section');
    if (finalPage && finalPage.style.display === 'block') {
        showFinalBill();
    }
};

async function fetchBanglaTranslation(text) {
    let cleanText = text.trim();
    if (!cleanText) return "";
    
    try {
        let url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=bn&dt=t&q=${encodeURIComponent(cleanText)}`;
        let response = await fetch(url);
        let data = await response.json();
        return data[0][0][0];
    } catch (error) {
        console.error("Translation Error: ", error);
        return capitalizeText(text); 
    }
}

async function autoTranslateCurrentBillItems() {
    for (let item of currentBillItems) {
        let cleanKey = item.product.trim().toLowerCase();
        if (!translationCache[cleanKey] && !banglaMappings[cleanKey]) {
            let translated = await fetchBanglaTranslation(item.product);
            translationCache[cleanKey] = translated;
        }
    }
}

function translateItemName(name) {
    if (!name) return "";
    let cleanName = name.trim().toLowerCase();

    if (currentLanguage === 'BN') {
        if (banglaMappings[cleanName]) {
            return banglaMappings[cleanName];
        }
        return translationCache[cleanName] ? translationCache[cleanName] : capitalizeText(name);
    } else {
        return capitalizeText(name);
    }
}

// ==========================================
// ৩. API & ম্যানুয়াল ম্যাপিং সিস্টেম
// ==========================================
function renderApiPageTable() {
    let apiTableBody = document.getElementById('apiProductList');
    if (!apiTableBody) return;

    apiTableBody.innerHTML = "";

    if (products.length === 0) {
        apiTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:#aaa; padding: 20px;">Storage-এ কোনো প্রোডাক্ট নেই!</td></tr>`;
        return;
    }

    products.forEach((product) => {
        let englishName = product.name;
        let cleanKey = englishName.trim().toLowerCase();
        let savedBanglaName = banglaMappings[cleanKey] || "";

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="api-english-name">${capitalizeText(englishName)}</td>
            <td>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <input type="text" 
                           class="api-bangla-input" 
                           data-english="${englishName}" 
                           value="${savedBanglaName}" 
                           placeholder="এখানে বাংলা নাম লিখুন..." 
                           style="flex: 1; padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #fff; font-size: 14px; margin: 0;">
                    <button type="button" 
                            onclick="saveBanglaTranslation('${englishName.replace(/'/g, "\\'")}', this)" 
                            style="padding: 8px 15px; background: #2ecc71; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold;">
                        SAVE
                    </button>
                </div>
            </td>
        `;
        apiTableBody.appendChild(tr);
    });
}

window.saveBanglaTranslation = function(englishName, buttonElement) {
    let inputField = buttonElement.parentElement.querySelector('.api-bangla-input');
    let banglaValue = inputField.value.trim();

    if (banglaValue === "") {
        alert("অনুগ্রহ করে একটি বাংলা নাম লিখুন!");
        return;
    }

    let cleanKey = englishName.trim().toLowerCase();
    banglaMappings[cleanKey] = banglaValue;
    set(ref(db, `${MAPPINGS_REF}/${cleanKey}`), banglaValue);

    let originalText = buttonElement.innerText;
    buttonElement.innerText = "SAVED ✓";
    buttonElement.style.background = "#00bfff";
    
    setTimeout(() => {
        buttonElement.innerText = originalText;
        buttonElement.style.background = "#2ecc71";
    }, 1500);
};

// ==========================================
// ৪. পার্টি ম্যানেজমেন্ট (Party System)
// ==========================================
const partyInputs = document.querySelectorAll('#party input:not(#searchParty)');
const savePartyBtn = document.querySelector('#party .save');
const cancelPartyBtn = document.querySelector('#party .cancel');
const partyList = document.getElementById('partyList');

function renderParties(filterText = "") {
    if (!partyList) return;
    partyList.innerHTML = '';
    parties.forEach((party) => {
        if (filterText && !party.name.toLowerCase().includes(filterText.toLowerCase())) return;

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${capitalizeText(party.name)}</td>
            <td>${party.address ? capitalizeText(party.address) : "-"}</td>
            <td>${party.phone || "-"}</td>
            <td>
                <button class="save" onclick="editParty('${party.id}')" style="padding: 5px 10px; margin:0; background:#3498db; color:white; border:none; cursor:pointer; border-radius:3px;">Edit</button>
                <button class="cancel" onclick="deleteParty('${party.id}')" style="padding: 5px 10px; margin:0; background:#e74c3c; color:white; border:none; cursor:pointer; border-radius:3px;">Del</button>
            </td>
        `;
        partyList.appendChild(tr);
    });
    updateDashboardCounts();
    populateBillsDropdowns();
}

if(savePartyBtn && partyInputs.length >= 3) {
    savePartyBtn.onclick = function() {
        let name = partyInputs[0].value.trim();
        let address = partyInputs[1].value.trim();
        let phone = partyInputs[2].value.trim();

        if(name === "") {
            alert("Party Name is required!");
            return;
        }

        if(editPartyKey !== null) {
            update(ref(db, `${PARTIES_REF}/${editPartyKey}`), { name, address, phone });
            editPartyKey = null;
            savePartyBtn.innerText = "SAVE";
        } else {
            push(ref(db, PARTIES_REF), { name, address, phone });
        }

        clearPartyInputs();
    };
}

if(cancelPartyBtn) {
    cancelPartyBtn.onclick = function() {
        clearPartyInputs();
        editPartyKey = null;
        if(savePartyBtn) savePartyBtn.innerText = "SAVE";
    };
}

function clearPartyInputs() {
    if(partyInputs.length >= 3) {
        partyInputs[0].value = '';
        partyInputs[1].value = '';
        partyInputs[2].value = '';
    }
}

window.editParty = function(id) {
    let party = parties.find(p => p.id === id);
    if(party && partyInputs.length >= 3) {
        editPartyKey = id;
        partyInputs[0].value = party.name;
        partyInputs[1].value = party.address;
        partyInputs[2].value = party.phone;
        if(savePartyBtn) savePartyBtn.innerText = "UPDATE";
    }
};

window.deleteParty = function(id) {
    if(confirm("Are you sure you want to delete this party?")) {
        remove(ref(db, `${PARTIES_REF}/${id}`));
    }
};

// ==========================================
// ৫. প্রোডাক্ট ম্যানেজমেন্ট (Storage System)
// ==========================================
const storageNameInput = document.getElementById('storageProdName');
const storageBarcodeInput = document.getElementById('storageBarcode');
const storageRateInput = document.querySelector('#storages input[placeholder="rate"]');
const storageMrpInput = document.querySelector('#storages input[placeholder="MRP"]');
const storageSelect = document.querySelector('#storages select');
const saveProductBtn = document.querySelector('#storages .save');
const cancelProductBtn = document.querySelector('#storages .cancel');
const productList = document.querySelector('#storages table tbody');

function renderProducts(filterText = "") {
    if (!productList) return;
    productList.innerHTML = '';
    products.forEach((prod) => {
        let textToSearch = (prod.name + " " + (prod.barcode || "")).toLowerCase();
        if (filterText && !textToSearch.includes(filterText.toLowerCase())) return;

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: left; padding-left: 15px;">
                <div style="font-weight: 600; color: #fff;">${capitalizeText(prod.name)}</div>
                ${prod.barcode ? `<div style="font-size: 12px; color: #00bfff; margin-top: 2px;">Barcode: ${prod.barcode}</div>` : ''}
            </td>
            <td>${formatMRP(prod.mrp)}</td>
            <td>${prod.rate}</td>
            <td>${prod.unit}</td>
            <td>
                <button class="save" onclick="editProduct('${prod.id}')" style="padding: 5px 10px; margin:0; background:#3498db; color:white; border:none; cursor:pointer; border-radius:3px;">Edit</button>
                <button class="cancel" onclick="deleteProduct('${prod.id}')" style="padding: 5px 10px; margin:0; background:#e74c3c; color:white; border:none; cursor:pointer; border-radius:3px;">Del</button>
            </td>
        `;
        productList.appendChild(tr);
    });
    updateDashboardCounts();
    populateBillsDropdowns();
    renderApiPageTable();
}

if(saveProductBtn && storageSelect) {
    saveProductBtn.onclick = function() {
        let name = storageNameInput.value.trim();
        let barcode = storageBarcodeInput.value.trim();
        let rate = storageRateInput.value.trim();
        let mrp = storageMrpInput.value.trim() !== "" ? storageMrpInput.value.trim() : "0";
        let unit = storageSelect.value;

        if(name === "" || rate === "") {
            alert("Product Name and Rate are required!");
            return;
        }

        if(editProductKey !== null) {
            update(ref(db, `${PRODUCTS_REF}/${editProductKey}`), { name, barcode, rate, mrp, unit });
            editProductKey = null;
            saveProductBtn.innerText = "SAVE";
        } else {
            push(ref(db, PRODUCTS_REF), { name, barcode, rate, mrp, unit });
        }

        clearStorageInputs();
    };
}

function clearStorageInputs() {
    if(storageNameInput) storageNameInput.value = '';
    if(storageBarcodeInput) storageBarcodeInput.value = '';
    if(storageRateInput) storageRateInput.value = '';
    if(storageMrpInput) storageMrpInput.value = '';
}

window.editProduct = function(id) {
    let prod = products.find(p => p.id === id);
    if(prod && storageSelect) {
        editProductKey = id;
        storageNameInput.value = prod.name;
        storageBarcodeInput.value = prod.barcode || "";
        storageRateInput.value = prod.rate;
        storageMrpInput.value = prod.mrp;
        storageSelect.value = prod.unit;
        if(saveProductBtn) saveProductBtn.innerText = "UPDATE";
    }
};

window.deleteProduct = function(id) {
    if(confirm("আপনি কি নিশ্চিত যে এই প্রোডাক্টটি ডিলিট করতে চান?")) {
        remove(ref(db, `${PRODUCTS_REF}/${id}`));
    }
};

// ==========================================
// ৬. ড্রপডাউন এবং মোবিাইল বারকোড অটো স্ক্যান
// ==========================================
function populateBillsDropdowns() {
    let partyNameInput = document.getElementById('partyName');
    let prodBarcodeBillInput = document.getElementById('prodBarcode');

    if(partyNameInput) {
        let partyListId = "billsPartyDatalist";
        let datalist = document.getElementById(partyListId) || document.createElement('datalist');
        datalist.id = partyListId;
        partyNameInput.setAttribute('list', partyListId);
        if(!document.getElementById(partyListId)) partyNameInput.parentNode.insertBefore(datalist, partyNameInput.nextSibling);
        
        datalist.innerHTML = '';
        parties.forEach(p => {
            let option = document.createElement('option');
            option.value = p.name;
            datalist.appendChild(option);
        });
    }

    // মোবাইল এবং স্ক্যানার দিয়ে স্ক্যান করলে সরাসরি ইনভোয়েসে বারকোড ধরা
    if (prodBarcodeBillInput) {
        prodBarcodeBillInput.oninput = function() {
            let barcodeVal = this.value.trim();
            if(barcodeVal === "") return;

            let matchedProduct = products.find(p => p.barcode && p.barcode.toLowerCase() === barcodeVal.toLowerCase());
            if (matchedProduct) {
                if(document.getElementById('prodName')) document.getElementById('prodName').value = matchedProduct.name;
                if(document.getElementById('prodRate')) document.getElementById('prodRate').value = matchedProduct.rate;
                if(document.getElementById('prodMrp')) document.getElementById('prodMrp').value = matchedProduct.mrp;
                if(document.querySelector('#bills select')) document.querySelector('#bills select').value = matchedProduct.unit;
                
                addToPreview(true);
            }
        };

        prodBarcodeBillInput.onkeydown = function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                let barcodeVal = this.value.trim();
                let matchedProduct = products.find(p => p.barcode && p.barcode.toLowerCase() === barcodeVal.toLowerCase());
                if (matchedProduct) {
                    addToPreview(true);
                }
            }
        };
    }
}

// ==========================================
// ৭. ইনভয়েস বিলিং সিস্টেম (Billing Logic)
// ==========================================
let currentBillItems = [];
let billPartyInfo = {};

window.addToPreview = function(isAutoScan = false) {
    let partyNameEl = document.getElementById('partyName');
    let partyAddressEl = document.getElementById('partyAddress');
    let partyPhoneEl = document.getElementById('partyPhone');
    let prodBarcodeEl = document.getElementById('prodBarcode');
    let prodNameEl = document.getElementById('prodName');
    let prodRateEl = document.getElementById('prodRate');
    let prodMrpEl = document.getElementById('prodMrp');
    let selectEl = document.querySelector('#bills select');
    let prodQtyEl = document.getElementById('prodQty'); 

    if (!partyNameEl || !prodNameEl || !prodRateEl) return;

    let pName = partyNameEl.value.trim();
    let pAddress = partyAddressEl ? partyAddressEl.value.trim() : "";
    let pPhone = partyPhoneEl ? partyPhoneEl.value.trim() : "";
    let prodBarcode = prodBarcodeEl ? prodBarcodeEl.value.trim() : "";
    let prodName = prodNameEl.value.trim();
    let prodRate = parseFloat(prodRateEl.value);
    let prodMrp = prodMrpEl && prodMrpEl.value.trim() !== "" ? prodMrpEl.value.trim() : "0";
    let prodQtyUnit = selectEl ? selectEl.value : "Kg";
    let qtyAmount = prodQtyEl ? parseFloat(prodQtyEl.value) : 1;

    if(pName === "") {
        alert("Party Name is required!");
        return;
    }

    if(prodName === "" || isNaN(prodRate)) {
        if(!isAutoScan) alert("Enter Valid Product Name and Rate!");
        return;
    }

    let total = prodRate * qtyAmount;

    billPartyInfo = { name: pName, address: pAddress, phone: pPhone };
    partyNameEl.disabled = true;

    currentBillItems.push({ 
        product: prodName, 
        barcode: prodBarcode, 
        mrp: prodMrp, 
        rate: prodRate, 
        qtyValue: qtyAmount, 
        unit: prodQtyUnit, 
        total: total 
    });

    // ইনপুট ক্লিয়ার করা
    prodNameEl.value = '';
    if(prodBarcodeEl) prodBarcodeEl.value = '';
    prodRateEl.value = '';
    if(prodMrpEl) prodMrpEl.value = '';
    if(prodQtyEl) prodQtyEl.value = '1';

    if(isAutoScan && prodBarcodeEl) {
        prodBarcodeEl.focus();
    }
};

window.openPreviewPage = function() {
    if(currentBillItems.length === 0) {
        alert("প্রিভিউ দেখার জন্য অন্তত একটি প্রোডাক্ট যোগ করুন!");
        return;
    }
    if(document.getElementById('input-section')) document.getElementById('input-section').style.display = 'none';
    let previewPage = document.getElementById('preview-section');
    if(previewPage) previewPage.style.display = 'block';
    renderPreviewTable();
};

function renderPreviewTable() {
    let previewTableBody = document.getElementById('previewTableBody');
    if(!previewTableBody) return;
    
    previewTableBody.innerHTML = '';
    currentBillItems.forEach((item, index) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${capitalizeText(item.product)}</td>
            <td>${formatMRP(item.mrp)}</td>
            <td>${item.rate}</td>
            <td>${item.qtyValue} ${item.unit}</td>
            <td>${item.total.toFixed(2)}</td>
            <td>
                <button onclick="deletePreviewItem(${index})" style="background:#e74c3c; color:white; border:none; padding:4px 8px;">Del</button>
            </td>
        `;
        previewTableBody.appendChild(tr);
    });
}

window.deletePreviewItem = function(index) {
    currentBillItems.splice(index, 1);
    renderPreviewTable();
};

window.showFinalBill = function() {
    if(currentBillItems.length === 0) return;
    let finalBillSection = document.getElementById('final-bill-section');
    if (!finalBillSection) return;

    finalBillSection.innerHTML = '';
    let grandTotal = currentBillItems.reduce((sum, item) => sum + item.total, 0);

    let tableHTML = `<table border="1" style="width:100%; text-align:center;">
        <tr><th>Item</th><th>MRP</th><th>Qty</th><th>Rate</th><th>Total</th></tr>`;
    
    currentBillItems.forEach(item => {
        tableHTML += `<tr>
            <td>${translateItemName(item.product)}</td>
            <td>${formatMRP(item.mrp)}</td>
            <td>${item.qtyValue} ${item.unit}</td>
            <td>${item.rate}</td>
            <td>${item.total.toFixed(2)}</td>
        </tr>`;
    });

    tableHTML += `<tr><td colspan="4"><b>Grand Total</b></td><td><b>${grandTotal.toFixed(2)}</b></td></tr></table>`;
    
    let actionRow = `
        <div style="margin-top:15px;">
            <button onclick="saveBillToHistory()" style="background:#2ecc71; color:white; padding:8px 15px;">Save Bill</button>
            <button onclick="window.print()" style="background:#3498db; color:white; padding:8px 15px;">Print</button>
        </div>
    `;

    finalBillSection.innerHTML = tableHTML + actionRow;
    if(document.getElementById('preview-section')) document.getElementById('preview-section').style.display = 'none';
    finalBillSection.style.display = 'block';
};

// ==========================================
// ৮. বিল হিস্টোরি (Firebase History)
// ==========================================
window.saveBillToHistory = function() {
    if (currentBillItems.length === 0) return;
    let grandTotal = currentBillItems.reduce((sum, item) => sum + item.total, 0);
    
    let newBill = {
        party: billPartyInfo,
        items: currentBillItems,
        grandTotal: grandTotal.toFixed(2),
        date: new Date().toLocaleDateString()
    };

    if (editBillKey !== null) {
        update(ref(db, `${BILLS_REF}/${editBillKey}`), newBill);
        editBillKey = null;
        alert("বিল আপডেট হয়েছে!");
    } else {
        push(ref(db, BILLS_REF), newBill);
        alert("বিল সেভ হয়েছে!");
    }

    clearCurrentBill();
};

function renderBillsHistoryTable() {
    let billsHistoryBody = document.getElementById('billsHistoryBody');
    if (!billsHistoryBody) return;
    billsHistoryBody.innerHTML = '';

    billsHistory.forEach((bill) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${bill.date}</td>
            <td>${bill.party ? capitalizeText(bill.party.name) : 'Unknown'}</td>
            <td>${bill.grandTotal}</td>
            <td>
                <button onclick="editBill('${bill.id}')" style="background:#3498db; color:white; border:none; padding:4px 8px;">Edit</button>
                <button onclick="deleteBill('${bill.id}')" style="background:#e74c3c; color:white; border:none; padding:4px 8px;">Del</button>
            </td>
        `;
        billsHistoryBody.appendChild(tr);
    });
}

window.editBill = function(id) {
    let bill = billsHistory.find(b => b.id === id);
    if (!bill) return;
    editBillKey = id;

    currentBillItems = [...bill.items];
    billPartyInfo = { ...bill.party };

    if (document.getElementById('input-section')) document.getElementById('input-section').style.display = 'block';
    if (document.getElementById('final-bill-section')) document.getElementById('final-bill-section').style.display = 'none';
    alert("ডাটা এডিটের জন্য লোড হয়েছে!");
};

window.deleteBill = function(id) {
    if (confirm("আপনি কি নিশ্চিত বিলটি ডিলিট করতে চান?")) {
        remove(ref(db, `${BILLS_REF}/${id}`));
    }
};

function clearCurrentBill() {
    currentBillItems = [];
    billPartyInfo = {};
    editBillKey = null;
    if(document.getElementById('final-bill-section')) document.getElementById('final-bill-section').style.display = 'none';
    if(document.getElementById('input-section')) document.getElementById('input-section').style.display = 'block';
}
