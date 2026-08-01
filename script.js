
// ==========================================
// ১. Firebase Setup & Session Listener
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCBPjgl6MuTSsqfrOH-PwwbU2bjil4UL0M",
    authDomain: "nbtbr-b67c2.firebaseapp.com",
    databaseURL: "https://nbtbr-b67c2-default-rtdb.firebaseio.com",
    projectId: "nbtbr-b67c2",
    storageBucket: "nbtbr-b67c2.appspot.com",
    messagingSenderId: "835471865300",
    appId: "1:835471865300:web:6fcfb66e29bfc97f4a9241"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ৪ ডিজিটের Session ID তৈরি (যেমন: 5821)
const pcSessionId = Math.floor(1000 + Math.random() * 9000).toString();

// স্ক্রিনে Session ID দেখানোর জন্য
window.addEventListener('DOMContentLoaded', () => {
    let sessionBox = document.getElementById('sessionDisplay');
    if (!sessionBox) {
        sessionBox = document.createElement('div');
        sessionBox.id = 'sessionDisplay';
        sessionBox.style.cssText = "position: fixed; top: 15px; right: 25px; background: #0091ff; color: #fff; padding: 10px 20px; border-radius: 25px; font-weight: bold; font-size: 18px; z-index: 99999; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 2px solid white;";
        document.body.appendChild(sessionBox);
    }
    sessionBox.innerText = `📱 Mobile Session ID: ${pcSessionId}`;
});

// মোবাইল থেকে আসা বারকোড ধরা
const scannedBarcodeRef = ref(db, `scanned_barcodes/${pcSessionId}`);
onValue(scannedBarcodeRef, (snapshot) => {
    const data = snapshot.val();
    if (data && data.barcode) {
        let barcodeInput = document.getElementById('prodBarcode');
        if (barcodeInput) {
            barcodeInput.value = data.barcode;
            // বারকোড বসলে অটোমেটিক প্রোডাক্ট খোঁজা ও বিল আইটেমে যোগ করা
            barcodeInput.dispatchEvent(new Event('input'));
        }
    }
});

// ==========================================
// ২. পেজ নেভিগেশন ও স্টেট
// ==========================================
let pages = document.querySelectorAll(".content");
let navLinks = document.querySelectorAll(".nav-link");

window.showPage = function(pageId) {
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

    if (pageId === 'api') window.renderApiPageTable();
};

window.showPage("dashboard");

navLinks.forEach(link => {
    link.onclick = function(e) {
        e.preventDefault();
        let targetId = this.getAttribute('href').substring(1);
        window.showPage(targetId);
    }
});

function capitalizeText(text) {
    if(!text) return "";
    return text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function formatMRP(mrpValue) {
    if (!mrpValue || mrpValue === "0" || parseFloat(mrpValue) === 0) return "-";
    return mrpValue;
}

// ==========================================
// ৩. Firebase Realtime Data State
// ==========================================
let parties = [];
let products = [];
let billsHistory = [];
let banglaMappings = {};

let editPartyIndex = null;
let editProductIndex = null;
let editBillIndex = null;

function updateDashboardCounts() {
    if(document.getElementById('partyCount')) document.getElementById('partyCount').innerText = parties.length;
    if(document.getElementById('storageCount')) document.getElementById('storageCount').innerText = products.length;
    if(document.getElementById('billCount')) document.getElementById('billCount').innerText = billsHistory.length;
}

onValue(ref(db, 'parties'), (snapshot) => {
    parties = snapshot.val() || [];
    window.renderParties();
});

onValue(ref(db, 'products'), (snapshot) => {
    products = snapshot.val() || [];
    window.renderProducts();
});

onValue(ref(db, 'billsHistory'), (snapshot) => {
    billsHistory = snapshot.val() || [];
    window.renderBillsHistoryTable();
});

onValue(ref(db, 'banglaMappings'), (snapshot) => {
    banglaMappings = snapshot.val() || {};
    window.renderApiPageTable();
});

function savePartiesToDB() { set(ref(db, 'parties'), parties); }
function saveProductsToDB() { set(ref(db, 'products'), products); }
function saveBillsToDB() { set(ref(db, 'billsHistory'), billsHistory); }

// ==========================================
// ৪. পার্টি ম্যানেজমেন্ট (Party Logic)
// ==========================================
const partyInputs = document.querySelectorAll('#party input:not(#searchParty)');
const savePartyBtn = document.querySelector('#party .save');
const partyList = document.getElementById('partyList');

window.renderParties = function(filterText = "") {
    if (!partyList) return;
    partyList.innerHTML = '';
    parties.forEach((party, index) => {
        if (filterText && !party.name.toLowerCase().includes(filterText.toLowerCase())) return;

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${capitalizeText(party.name)}</td>
            <td>${party.address ? capitalizeText(party.address) : "-"}</td>
            <td>${party.phone || "-"}</td>
            <td>
                <button onclick="window.editParty(${index})" style="padding: 5px 10px; background:#3498db; color:white; border:none; cursor:pointer; border-radius:3px;">Edit</button>
                <button onclick="window.deleteParty(${index})" style="padding: 5px 10px; background:#e74c3c; color:white; border:none; cursor:pointer; border-radius:3px;">Del</button>
            </td>
        `;
        partyList.appendChild(tr);
    });
    updateDashboardCounts();
    populateBillsDropdowns();
};

if(savePartyBtn && partyInputs.length >= 3) {
    savePartyBtn.onclick = function() {
        let name = partyInputs[0].value.trim();
        let address = partyInputs[1].value.trim();
        let phone = partyInputs[2].value.trim();

        if(name === "") { alert("Party Name is required!"); return; }

        if(editPartyIndex !== null) {
            parties[editPartyIndex] = { name, address, phone };
            editPartyIndex = null;
            savePartyBtn.innerText = "SAVE";
        } else {
            parties.push({ name, address, phone });
        }

        savePartiesToDB();
        clearPartyInputs();
    };
}

function clearPartyInputs() {
    if(partyInputs.length >= 3) {
        partyInputs[0].value = ''; partyInputs[1].value = ''; partyInputs[2].value = '';
    }
}

window.editParty = function(index) {
    if(partyInputs.length >= 3) {
        editPartyIndex = index;
        partyInputs[0].value = parties[index].name;
        partyInputs[1].value = parties[index].address || "";
        partyInputs[2].value = parties[index].phone || "";
        if(savePartyBtn) savePartyBtn.innerText = "UPDATE";
    }
};

window.deleteParty = function(index) {
    if(confirm("Are you sure you want to delete this party?")) {
        parties.splice(index, 1);
        savePartiesToDB();
    }
};

// ==========================================
// ৫. প্রোডাক্ট ম্যানেজমেন্ট (Storage Logic)
// ==========================================
const storageNameInput = document.getElementById('storageProdName');
const storageBarcodeInput = document.getElementById('storageBarcode');
const storageRateInput = document.querySelector('#storages input[placeholder="rate"]');
const storageMrpInput = document.querySelector('#storages input[placeholder="MRP"]');
const storageSelect = document.querySelector('#storages select');
const saveProductBtn = document.querySelector('#storages .save');
const productList = document.querySelector('#storages table tbody');

window.renderProducts = function(filterText = "") {
    if (!productList) return;
    productList.innerHTML = '';
    products.forEach((prod, index) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: left; padding-left: 15px;">
                <div style="font-weight: 600; color: #fff;">${capitalizeText(prod.name)}</div>
                ${prod.barcode ? `<div style="font-size: 12px; color: #00bfff;">Barcode: ${prod.barcode}</div>` : ''}
            </td>
            <td>${formatMRP(prod.mrp)}</td>
            <td>${prod.rate}</td>
            <td>${prod.unit}</td>
            <td>
                <button onclick="window.editProduct(${index})" style="padding: 5px 10px; background:#3498db; color:white; border:none; cursor:pointer; border-radius:3px;">Edit</button>
                <button onclick="window.deleteProduct(${index})" style="padding: 5px 10px; background:#e74c3c; color:white; border:none; cursor:pointer; border-radius:3px;">Del</button>
            </td>
        `;
        productList.appendChild(tr);
    });
    updateDashboardCounts();
    populateBillsDropdowns();
};

if(saveProductBtn && storageSelect) {
    saveProductBtn.onclick = function() {
        let name = storageNameInput.value.trim();
        let barcode = storageBarcodeInput.value.trim();
        let rate = storageRateInput.value.trim();
        let mrp = storageMrpInput.value.trim() !== "" ? storageMrpInput.value.trim() : "0";
        let unit = storageSelect.value;

        if(name === "" || rate === "") { alert("Product Name and Rate are required!"); return; }

        if(editProductIndex !== null) {
            products[editProductIndex] = { name, barcode, rate, mrp, unit };
            editProductIndex = null;
            saveProductBtn.innerText = "SAVE";
        } else {
            products.push({ name, barcode, rate, mrp, unit });
        }

        saveProductsToDB();
        clearStorageInputs();
    };
}

window.editProduct = function(index) {
    editProductIndex = index;
    storageNameInput.value = products[index].name;
    storageBarcodeInput.value = products[index].barcode || "";
    storageRateInput.value = products[index].rate;
    storageMrpInput.value = products[index].mrp;
    storageSelect.value = products[index].unit;
    if(saveProductBtn) saveProductBtn.innerText = "UPDATE";
};

window.deleteProduct = function(index) {
    if(confirm("আপনি কি প্রোডাক্টটি ডিলিট করতে চান?")) {
        products.splice(index, 1);
        saveProductsToDB();
    }
};

function clearStorageInputs() {
    if(storageNameInput) storageNameInput.value = '';
    if(storageBarcodeInput) storageBarcodeInput.value = '';
    if(storageRateInput) storageRateInput.value = '';
    if(storageMrpInput) storageMrpInput.value = '';
}

// ==========================================
// ৬. ড্রপডাউন এবং বারকোড অটো সার্চ
// ==========================================
function populateBillsDropdowns() {
    let prodBarcodeBillInput = document.getElementById('prodBarcode');

    if (prodBarcodeBillInput) {
        prodBarcodeBillInput.oninput = function() {
            let barcodeVal = this.value.trim();
            if(barcodeVal === "") return;

            let matchedProduct = products.find(p => p.barcode && p.barcode === barcodeVal);
            if (matchedProduct) {
                if(document.getElementById('prodName')) document.getElementById('prodName').value = matchedProduct.name;
                if(document.getElementById('prodRate')) document.getElementById('prodRate').value = matchedProduct.rate;
                if(document.getElementById('prodMrp')) document.getElementById('prodMrp').value = matchedProduct.mrp;
                if(document.querySelector('#bills select')) document.querySelector('#bills select').value = matchedProduct.unit;
                
                window.addToPreview(true);
            }
        };
    }
}

// ==========================================
// ৭. ইনভয়েস বিলিং ও Final Bill তৈরি
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

    if(pName === "") { alert("Party Name is required!"); return; }
    if(prodName === "" || isNaN(prodRate)) { if(!isAutoScan) alert("Valid Name & Rate is required!"); return; }

    let total = prodRate * qtyAmount;
    billPartyInfo = { name: pName, address: pAddress, phone: pPhone };

    currentBillItems.push({ 
        product: prodName, 
        barcode: prodBarcode, 
        mrp: prodMrp, 
        rate: prodRate, 
        qtyValue: qtyAmount, 
        unit: prodQtyUnit, 
        total: total 
    });

    prodNameEl.value = '';
    if(prodBarcodeEl) prodBarcodeEl.value = '';
    prodRateEl.value = '';
    if(prodMrpEl) prodMrpEl.value = '';
    if(prodQtyEl) prodQtyEl.value = '1';

    renderBillPreviewTable();
};

function renderBillPreviewTable() {
    let previewTable = document.getElementById('billPreviewBody') || document.getElementById('previewTableBody');
    if (!previewTable) return;
    previewTable.innerHTML = '';

    currentBillItems.forEach((item, idx) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:left; padding-left:10px;">${item.product}</td>
            <td>${item.qtyValue} ${item.unit}</td>
            <td>${item.rate}</td>
            <td>${item.total.toFixed(2)}</td>
            <td><button onclick="window.removePreviewItem(${idx})" style="background:#e74c3c; color:#fff; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">Del</button></td>
        `;
        previewTable.appendChild(tr);
    });
}

window.removePreviewItem = function(idx) {
    currentBillItems.splice(idx, 1);
    renderBillPreviewTable();
};

// Create Final Bill বাটনে ক্লিক করলে তা বিল ভিউ করবে
window.createFinalBill = function() {
    if (currentBillItems.length === 0) {
        alert("বিলের মধ্যে কোনো প্রোডাক্ট নেই!");
        return;
    }

    let grandTotal = currentBillItems.reduce((sum, item) => sum + item.total, 0);

    if (document.getElementById('finalPartyName')) document.getElementById('finalPartyName').innerText = capitalizeText(billPartyInfo.name);
    if (document.getElementById('finalPartyAddress')) document.getElementById('finalPartyAddress').innerText = billPartyInfo.address || '-';
    if (document.getElementById('finalPartyPhone')) document.getElementById('finalPartyPhone').innerText = billPartyInfo.phone || '-';
    if (document.getElementById('finalGrandTotal')) document.getElementById('finalGrandTotal').innerText = grandTotal.toFixed(2);

    let finalItemsTable = document.getElementById('finalBillItemsBody');
    if (finalItemsTable) {
        finalItemsTable.innerHTML = '';
        currentBillItems.forEach((item, i) => {
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td style="text-align:left; padding-left:10px;">${item.product}</td>
                <td>${formatMRP(item.mrp)}</td>
                <td>${item.qtyValue} ${item.unit}</td>
                <td>${item.rate}</td>
                <td>${item.total.toFixed(2)}</td>
            `;
            finalItemsTable.appendChild(tr);
        });
    }

    if (document.getElementById('input-section')) document.getElementById('input-section').style.display = 'none';
    if (document.getElementById('preview-section')) document.getElementById('preview-section').style.display = 'none';
    if (document.getElementById('final-bill-section')) document.getElementById('final-bill-section').style.display = 'block';
};

window.saveBillToHistory = function() {
    if (currentBillItems.length === 0) return;
    let grandTotal = currentBillItems.reduce((sum, item) => sum + item.total, 0);

    billsHistory.push({
        party: billPartyInfo,
        items: [...currentBillItems],
        grandTotal: grandTotal.toFixed(2),
        date: new Date().toLocaleDateString()
    });

    saveBillsToDB();
    alert("বিল সফলভাবে সেভ হয়েছে!");
    currentBillItems = [];
    renderBillPreviewTable();
    if (document.getElementById('final-bill-section')) document.getElementById('final-bill-section').style.display = 'none';
    if (document.getElementById('input-section')) document.getElementById('input-section').style.display = 'block';
};

window.renderBillsHistoryTable = function() {
    let billsHistoryBody = document.getElementById('billsHistoryBody');
    if (!billsHistoryBody) return;
    billsHistoryBody.innerHTML = '';

    billsHistory.forEach((bill, index) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${bill.date}</td>
            <td>${bill.party ? capitalizeText(bill.party.name) : 'Unknown'}</td>
            <td>${bill.grandTotal}</td>
            <td>
                <button onclick="window.deleteBill(${index})" style="padding: 5px 10px; background:#e74c3c; color:white; border:none; cursor:pointer; border-radius:3px;">Del</button>
            </td>
        `;
        billsHistoryBody.appendChild(tr);
    });
};

window.deleteBill = function(index) {
    if (confirm("বিলটি ডিলিট করতে চান?")) {
        billsHistory.splice(index, 1);
        saveBillsToDB();
    }
};

window.renderApiPageTable = function() {};
