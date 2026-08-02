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

// ডিফল্ট পেজ লোড
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

// ==========================================
// ২. লোকাল স্টোরেজ ও কাউন্টার ম্যানেজমেন্ট
// ==========================================
let parties = JSON.parse(localStorage.getItem('parties')) || [];
let products = JSON.parse(localStorage.getItem('products')) || [];
let billsHistory = JSON.parse(localStorage.getItem('billsHistory')) || [];
let banglaMappings = JSON.parse(localStorage.getItem('banglaMappings')) || {};

let editPartyIndex = null;
let editProductIndex = null;
let editBillIndex = null; 

function updateDashboardCounts() {
    if(document.getElementById('partyCount')) document.getElementById('partyCount').innerText = parties.length;
    if(document.getElementById('storageCount')) document.getElementById('storageCount').innerText = products.length;
    if(document.getElementById('billCount')) document.getElementById('billCount').innerText = billsHistory.length;
}

// =================================================================
// ★ অটোমেটিক ল্যাঙ্গুয়েজ ট্রান্সলেশন সিস্টেম (গুগল API ভিত্তিক)
// =================================================================
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

// =================================================================
// ★ API & বাংলা ম্যানুয়াল ম্যাপিং এবং ওয়ান-ক্লিক অটো ট্রান্সলেটর
// =================================================================
function renderApiPageTable() {
    let apiTableBody = document.getElementById('apiProductList');
    if (!apiTableBody) return;

    apiTableBody.innerHTML = "";

    if (products.length === 0) {
        apiTableBody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:#aaa; padding: 20px;">Storage-এ কোনো প্রোডাক্ট নেই! প্রথমে Storage ট্যাবে প্রোডাক্ট যোগ করুন।</td></tr>`;
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
                            style="padding: 8px 15px; background: #2ecc71; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; width: auto; margin: 0; box-shadow: none;">
                        SAVE
                    </button>
                </div>
            </td>
        `;
        apiTableBody.appendChild(tr);
    });
}

window.autoTranslateAllStorageProducts = async function(btnElement) {
    if (products.length === 0) {
        alert("Storage-এ কোনো প্রোডাক্ট নেই!");
        return;
    }
    
    let originalText = btnElement.innerText;
    btnElement.innerText = "Translating & Saving... ⏳";
    btnElement.disabled = true;

    for (let prod of products) {
        let cleanKey = prod.name.trim().toLowerCase();
        if (!banglaMappings[cleanKey]) {
            let translatedName = await fetchBanglaTranslation(prod.name);
            if (translatedName) {
                banglaMappings[cleanKey] = translatedName;
            }
        }
    }

    localStorage.setItem('banglaMappings', JSON.stringify(banglaMappings));
    renderApiPageTable();
    
    btnElement.innerText = "Success! All Saved ✓";
    btnElement.style.background = "#2ecc71";
    setTimeout(() => {
        btnElement.innerText = originalText;
        btnElement.style.background = "#00bfff";
        btnElement.disabled = false;
    }, 2000);
};

window.saveBanglaTranslation = function(englishName, buttonElement) {
    let inputField = buttonElement.parentElement.querySelector('.api-bangla-input');
    let banglaValue = inputField.value.trim();

    if (banglaValue === "") {
        alert("অনুগ্রহ করে একটি বাংলা নাম লিখুন!");
        return;
    }

    let cleanKey = englishName.trim().toLowerCase();
    banglaMappings[cleanKey] = banglaValue;
    localStorage.setItem('banglaMappings', JSON.stringify(banglaMappings));

    let originalText = buttonElement.innerText;
    buttonElement.innerText = "SAVED ✓";
    buttonElement.style.background = "#00bfff";
    
    setTimeout(() => {
        buttonElement.innerText = originalText;
        buttonElement.style.background = "#2ecc71";
    }, 1500);
};

document.getElementById('apiBanglaSearch')?.addEventListener('input', function(e) {
    let filterValue = e.target.value.trim().toLowerCase();
    let tableRows = document.querySelectorAll('#apiProductList tr');

    tableRows.forEach(row => {
        let englishCell = row.querySelector('.api-english-name');
        if (englishCell) {
            let currentEnglishText = englishCell.innerText.toLowerCase();
            if (currentEnglishText.includes(filterValue)) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        }
    });
});

// ==========================================
// ৩. পার্টি ম্যানেজমেন্ট (Party Logic)
// ==========================================
const partyInputs = document.querySelectorAll('#party input:not(#searchParty)');
const savePartyBtn = document.querySelector('#party .save');
const cancelPartyBtn = document.querySelector('#party .cancel');
const partyList = document.getElementById('partyList');

function renderParties(filterText = "") {
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
                <button class="save" onclick="editParty(${index})" style="padding: 5px 10px; margin:0; background:#3498db; color:white; border:none; cursor:pointer; border-radius:3px;">Edit</button>
                <button class="cancel" onclick="deleteParty(${index})" style="padding: 5px 10px; margin:0; background:#e74c3c; color:white; border:none; cursor:pointer; border-radius:3px;">Del</button>
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

        let isDuplicate = parties.some((party, idx) => party.name.toLowerCase() === name.toLowerCase() && idx !== editPartyIndex);
        if(isDuplicate) {
            alert("This Party Name already exists!");
            return;
        }

        if(editPartyIndex !== null) {
            parties[editPartyIndex] = { name, address, phone };
            editPartyIndex = null;
            savePartyBtn.innerText = "SAVE";
        } else {
            parties.push({ name, address, phone });
        }

        localStorage.setItem('parties', JSON.stringify(parties));
        clearPartyInputs();
        renderParties();
    };
}

if(cancelPartyBtn) {
    cancelPartyBtn.onclick = function() {
        clearPartyInputs();
        editPartyIndex = null;
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

window.editParty = function(index) {
    if(partyInputs.length >= 3) {
        editPartyIndex = index;
        partyInputs[0].value = parties[index].name;
        partyInputs[1].value = parties[index].address;
        partyInputs[2].value = parties[index].phone;
        if(savePartyBtn) savePartyBtn.innerText = "UPDATE";
    }
};

window.deleteParty = function(index) {
    if(confirm("Are you sure you want to delete this party?")) {
        parties.splice(index, 1);
        localStorage.setItem('parties', JSON.stringify(parties));
        renderParties();
    }
};

const searchPartyInput = document.getElementById('searchParty');
if (searchPartyInput) {
    searchPartyInput.addEventListener('input', function() {
        renderParties(this.value.trim());
    });
}

// ==========================================
// ৪. প্রোডাক্ট ম্যানেজমেন্ট (Storage Logic)
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
    products.forEach((prod, index) => {
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
                <button class="save" onclick="editProduct(${index})" style="padding: 5px 10px; margin:0; background:#3498db; color:white; border:none; cursor:pointer; border-radius:3px;">Edit</button>
                <button class="cancel" onclick="deleteProduct(${index})" style="padding: 5px 10px; margin:0; background:#e74c3c; color:white; border:none; cursor:pointer; border-radius:3px;">Del</button>
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

        if(barcode !== "") {
            let isBarcodeDuplicate = products.some((prod, idx) => prod.barcode === barcode && idx !== editProductIndex);
            if(isBarcodeDuplicate) {
                alert("এই Barcode টি অন্য একটি প্রোডাক্টে ইতিমধ্যে দেওয়া আছে!");
                return;
            }
        }

        if(editProductIndex !== null) {
            products[editProductIndex] = { name, barcode, rate, mrp, unit };
            editProductIndex = null;
            saveProductBtn.innerText = "SAVE";
        } else {
            products.push({ name, barcode, rate, mrp, unit });
        }

        localStorage.setItem('products', JSON.stringify(products));
        clearStorageInputs();
        renderProducts();
    };
}

const storageDropdown = document.getElementById('storageDropdown');

if (storageNameInput) {
    storageNameInput.addEventListener('input', function() {
        let value = this.value.trim().toLowerCase();
        storageDropdown.innerHTML = '';
        
        if (value === "") {
            storageDropdown.style.display = 'none';
            return;
        }

        let matches = products.filter(p => p.name.toLowerCase().includes(value) || (p.barcode && p.barcode.includes(value)));
        
        if (matches.length === 0) {
            storageDropdown.style.display = 'none';
            return;
        }

        matches.forEach((prod) => {
            let item = document.createElement('div');
            item.className = 'custom-dropdown-item';
            item.innerHTML = `
                <div>
                    <span>${capitalizeText(prod.name)}</span>
                    ${prod.barcode ? `<small style="display:block; color:#00bfff; font-size:11px;">[${prod.barcode}]</small>` : ''}
                </div>
                <div class="badge-container">
                    <span class="rate-badge">Rate: ${prod.rate}</span>
                    <span class="mrp-badge">MRP: ${formatMRP(prod.mrp)}</span>
                </div>
            `;

            item.addEventListener('click', () => {
                storageNameInput.value = prod.name;
                storageBarcodeInput.value = prod.barcode || "";
                storageRateInput.value = prod.rate;
                storageMrpInput.value = prod.mrp;
                storageSelect.value = prod.unit;
                storageDropdown.style.display = 'none';
            });

            storageDropdown.appendChild(item);
        });

        storageDropdown.style.display = 'block';
    });
}

document.addEventListener('click', (e) => {
    if (storageNameInput && storageDropdown && !storageNameInput.contains(e.target) && !storageDropdown.contains(e.target)) {
        storageDropdown.style.display = 'none';
    }
});

if(cancelProductBtn) {
    cancelProductBtn.onclick = function() {
        clearStorageInputs();
        editProductIndex = null;
        if(saveProductBtn) saveProductBtn.innerText = "SAVE";
    };
}

function clearStorageInputs() {
    if(storageNameInput) storageNameInput.value = '';
    if(storageBarcodeInput) storageBarcodeInput.value = '';
    if(storageRateInput) storageRateInput.value = '';
    if(storageMrpInput) storageMrpInput.value = '';
}

window.editProduct = function(index) {
    if(storageSelect) {
        editProductIndex = index;
        storageNameInput.value = products[index].name;
        storageBarcodeInput.value = products[index].barcode || "";
        storageRateInput.value = products[index].rate;
        storageMrpInput.value = products[index].mrp;
        storageSelect.value = products[index].unit;
        if(saveProductBtn) saveProductBtn.innerText = "UPDATE";
    }
};

window.deleteProduct = function(index) {
    if(confirm("আপনি কি নিশ্চিত যে এই প্রোডাক্টটি ডিলিট করতে চান?")) {
        products.splice(index, 1);
        localStorage.setItem('products', JSON.stringify(products));
        renderProducts();
    }
};

const searchStorageInput = document.getElementById('searchStorage');
if (searchStorageInput) {
    searchStorageInput.addEventListener('input', function() {
        renderProducts(this.value.trim());
    });
}

// ==========================================
// ৫. ড্রপডাউন এবং অটোমেটিক বারকোড স্ক্যান লজিক
// ==========================================
function populateBillsDropdowns() {
    let partyNameInput = document.getElementById('partyName');
    let prodNameInput = document.getElementById('prodName');
    let prodBarcodeBillInput = document.getElementById('prodBarcode');
    let dropdown = document.getElementById('customProdDropdown');

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
        partyNameInput.oninput = function() {
            let val = this.value.trim();
            let selectedParty = parties.find(p => p.name.toLowerCase() === val.toLowerCase());
            
            if(selectedParty) {
                if(document.getElementById('partyAddress')) document.getElementById('partyAddress').value = selectedParty.address;
                if(document.getElementById('partyPhone')) document.getElementById('partyPhone').value = selectedParty.phone;
            } else {
                if(document.getElementById('partyAddress')) document.getElementById('partyAddress').value = '';
                if(document.getElementById('partyPhone')) document.getElementById('partyPhone').value = '';
            }
        };
        partyNameInput.onchange = partyNameInput.oninput;
    }

    if (prodBarcodeBillInput) {
        prodBarcodeBillInput.oninput = function() {
            let barcodeVal = this.value.trim();
            if(dropdown) dropdown.style.display = 'none';

            if(barcodeVal === "") return;

            let matchedProduct = products.find(p => p.barcode && p.barcode === barcodeVal);
            if (matchedProduct) {
                if(document.getElementById('prodName')) document.getElementById('prodName').value = matchedProduct.name;
                if(document.getElementById('prodRate')) document.getElementById('prodRate').value = matchedProduct.rate;
                if(document.getElementById('prodMrp')) document.getElementById('prodMrp').value = matchedProduct.mrp;
                if(document.querySelector('#bills select')) document.querySelector('#bills select').value = matchedProduct.unit;
                
                addToPreview(true);
            }
        };

        prodBarcodeBillInput.onkeydown = function(e) {
            if (e.keyCode === 13) {
                e.preventDefault();
                let barcodeVal = this.value.trim();
                let matchedProduct = products.find(p => p.barcode && p.barcode === barcodeVal);
                if (matchedProduct) {
                    addToPreview(true);
                }
            }
        };
    }

    if(prodNameInput && dropdown) {
        prodNameInput.removeAttribute('list');
        let currentFocus = -1;

        prodNameInput.oninput = function() {
            let value = this.value.trim().toLowerCase();
            dropdown.innerHTML = '';
            currentFocus = -1;
            
            if(value === "") {
                dropdown.style.display = 'none';
                if(document.getElementById('prodRate')) document.getElementById('prodRate').value = '';
                if(document.getElementById('prodMrp')) document.getElementById('prodMrp').value = '';
                if(document.getElementById('prodBarcode')) document.getElementById('prodBarcode').value = '';
                if(document.querySelector('#bills select')) document.querySelector('#bills select').value = 'Kg';
                return;
            }

            let matches = products.filter(p => p.name.toLowerCase().includes(value) || (p.barcode && p.barcode.includes(value)));
            if(matches.length === 0) {
                dropdown.style.display = 'none';
                return;
            }

            matches.forEach((prod) => {
                let item = document.createElement('div');
                item.className = 'custom-dropdown-item';
                item.innerHTML = `
                    <div>
                        <span>${capitalizeText(prod.name)}</span>
                        ${prod.barcode ? `<small style="display:block; color:#00bfff; font-size:11px;">[${prod.barcode}]</small>` : ''}
                    </div>
                    <div class="badge-container">
                        <span class="rate-badge">Rate: ${prod.rate}</span>
                        <span class="mrp-badge">MRP: ${formatMRP(prod.mrp)}</span>
                    </div>
                `;

                item.addEventListener('click', () => {
                    prodNameInput.value = prod.name;
                    if(document.getElementById('prodBarcode')) document.getElementById('prodBarcode').value = prod.barcode || "";
                    if(document.getElementById('prodRate')) document.getElementById('prodRate').value = prod.rate;
                    if(document.getElementById('prodMrp')) document.getElementById('prodMrp').value = prod.mrp;
                    if(document.querySelector('#bills select')) document.querySelector('#bills select').value = prod.unit;
                    dropdown.style.display = 'none';
                });

                dropdown.appendChild(item);
            });

            dropdown.style.display = 'block';
        };

        prodNameInput.onkeydown = function(e) {
            let items = dropdown.getElementsByClassName('custom-dropdown-item');
            if (items.length === 0) return;

            if (e.keyCode === 40) { 
                currentFocus++;
                addActive(items);
            } else if (e.keyCode === 38) { 
                currentFocus--;
                addActive(items);
            } else if (e.keyCode === 13) { 
                if (currentFocus > -1) {
                    e.preventDefault();
                    if (items[currentFocus]) items[currentFocus].click();
                } else if(items.length > 0) {
                    e.preventDefault();
                    items[0].click();
                }
            }
        };

        function addActive(items) {
            if (!items) return false;
            removeActive(items);
            if (currentFocus >= items.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = items.length - 1;
            items[currentFocus].classList.add("active-item");
            items[currentFocus].scrollIntoView({ block: 'nearest' });
        }

        function removeActive(items) {
            for (let i = 0; i < items.length; i++) {
                items[i].classList.remove("active-item");
            }
        }

        document.addEventListener('click', (e) => {
            if (!prodNameInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }
}

// ==========================================
// ৬. ইনভয়েস বিলিং সিস্টেম (Billing Logic)
// ==========================================
let currentBillItems = [];
let billPartyInfo = {};
let editBillItemIndex = null;

function getFormattedDate() {
    const d = new Date();
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

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

    if (!partyNameEl || !prodNameEl || !prodRateEl) {
        alert("HTML fields are missing!");
        return;
    }

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

    let isAbsoluteBillDuplicate = currentBillItems.some((item, idx) => 
        item.product.toLowerCase() === prodName.toLowerCase() &&
        parseFloat(item.rate) === prodRate &&
        item.mrp === prodMrp &&
        item.unit === prodQtyUnit &&
        idx !== editBillItemIndex
    );
    if(isAbsoluteBillDuplicate) {
        if(!isAutoScan) alert(`এই প্রোডাক্টটি ইতিমধ্যে প্রিভিউ লিস্টে আছে।`);
        if(prodBarcodeEl) prodBarcodeEl.value = '';
        prodNameEl.value = '';
        prodRateEl.value = '';
        if(prodMrpEl) prodMrpEl.value = '';
        return;
    }

    let total = prodRate * qtyAmount;

    if(!parties.some(p => p.name.toLowerCase() === pName.toLowerCase())) {
        parties.push({ name: pName, address: pAddress, phone: pPhone });
        localStorage.setItem('parties', JSON.stringify(parties));
        renderParties();
    }
    
    if(!products.some(p => p.name.toLowerCase() === prodName.toLowerCase() && p.unit === prodQtyUnit && p.mrp === prodMrp)) {
        products.push({ name: prodName, barcode: prodBarcode, rate: prodRate, mrp: prodMrp, unit: prodQtyUnit });
        localStorage.setItem('products', JSON.stringify(products));
        renderProducts();
    }

    billPartyInfo = { name: pName, address: pAddress, phone: pPhone };
    partyNameEl.disabled = true;
    if(partyAddressEl) partyAddressEl.disabled = true;
    if(partyPhoneEl) partyPhoneEl.disabled = true;

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
    
    let dropdown = document.getElementById('customProdDropdown');
    if(dropdown) dropdown.style.display = 'none';

    if(document.getElementById('historyTableContainer')) document.getElementById('historyTableContainer').style.display = 'none';

    if(!isAutoScan) {
        alert(`"${prodName}" প্রিভিউ লিস্টে যোগ হয়েছে!`);
    } else {
        if(prodBarcodeEl) prodBarcodeEl.focus();
    }
};

window.goToPreviewDirectly = function() {
    openPreviewPage();
};

function openPreviewPage() {
    if(currentBillItems.length === 0) {
        alert("প্রিভিউ দেখার জন্য প্রথমে অন্তত একটি প্রোডাক্ট যোগ করুন!");
        return;
    }
    if(document.getElementById('input-section')) document.getElementById('input-section').style.display = 'none';
    if(document.getElementById('historyTableContainer')) document.getElementById('historyTableContainer').style.display = 'none';
    
    let previewPage = document.getElementById('preview-section');
    if(previewPage) previewPage.style.display = 'block';
    renderPreviewTable();
}

function renderPreviewTable() {
    let previewTableBody = document.getElementById('previewTableBody');
    if(!previewTableBody) return;
    
    previewTableBody.innerHTML = '';
    currentBillItems.forEach((item, index) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: left; padding-left: 15px;">
                <div style="font-weight: 500; color: #fff;">${capitalizeText(item.product)}</div>
                ${item.barcode ? `<div style="font-size: 11px; color: #00bfff;">[${item.barcode}]</div>` : ''}
            </td>
            <td>
                <input type="text" value="${item.mrp === '-' ? '0' : item.mrp}" 
                       oninput="updateInlineBillItem(${index}, 'mrp', this.value)" 
                       style="width:75px; padding:6px; background: rgba(255,255,255,0.1); border:1px solid #555; color:#fff; border-radius:4px; text-align:center;">
            </td>
            <td>
                <input type="number" value="${item.rate}" step="any"
                       oninput="updateInlineBillItem(${index}, 'rate', this.value)" 
                       style="width:85px; padding:6px; background: rgba(255,255,255,0.1); border:1px solid #555; color:#fff; border-radius:4px; text-align:center;">
            </td>
            <td>
                <div style="display: flex; gap: 8px; align-items: center; justify-content: center;">
                    <input type="number" value="${item.qtyValue}" min="0.001" step="any" 
                           oninput="updateInlineBillItem(${index}, 'qtyValue', this.value)" 
                           style="width:75px; padding:6px; background: rgba(255,255,255,0.1); border:1px solid #555; color:#fff; border-radius:4px; text-align:center;">
                    <span style="color: #fff; font-weight: 500; min-width: 40px; text-align: left;">${item.unit}</span>
                </div>
            </td>
            <td id="total-${index}" style="font-weight: bold; color: #2ecc71;">${item.total.toFixed(2)}</td>
            <td>
                <button class="cancel" onclick="deletePreviewItem(${index})" style="padding: 6px 12px; margin:0; background:#e74c3c; color:white; border:none; cursor:pointer; border-radius:4px; font-weight:bold;">Delete</button>
            </td>
        `;
        previewTableBody.appendChild(tr);
    });
}

window.updateInlineBillItem = function(index, field, value) {
    if (!currentBillItems[index]) return;
    if (field === 'mrp') {
        currentBillItems[index].mrp = value.trim() === "" || value.trim() === "0" ? "-" : value.trim();
    } else if (field === 'rate') {
        let parsedRate = parseFloat(value);
        currentBillItems[index].rate = isNaN(parsedRate) ? 0 : parsedRate;
    } else if (field === 'qtyValue') { 
        let parsedQty = parseFloat(value);
        currentBillItems[index].qtyValue = isNaN(parsedQty) ? 0 : parsedQty;
    }
    currentBillItems[index].total = currentBillItems[index].rate * currentBillItems[index].qtyValue;
    let totalCell = document.getElementById(`total-${index}`);
    if (totalCell) totalCell.innerText = currentBillItems[index].total.toFixed(2);
};

window.deletePreviewItem = function(index) {
    currentBillItems.splice(index, 1);
    renderPreviewTable();
    if(currentBillItems.length === 0) clearCurrentBill();
};

window.goBackToInput = function() {
    if(document.getElementById('preview-section')) document.getElementById('preview-section').style.display = 'none';
    if(document.getElementById('input-section')) document.getElementById('input-section').style.display = 'block';
};

window.clearCurrentBill = function() {
    currentBillItems = [];
    billPartyInfo = {};
    editBillItemIndex = null;
    editBillIndex = null;
    const sidebar = document.querySelector('.side-bar');
    const mainContent = document.querySelector('.main-content');
    if(sidebar) sidebar.style.display = 'block'; 
    if(mainContent) mainContent.style.marginLeft = '280px';
    let fields = ['partyName', 'partyAddress', 'partyPhone', 'prodBarcode', 'prodName', 'prodMrp', 'prodRate', 'prodQty'];
    fields.forEach(id => {
        let el = document.getElementById(id);
        if(el) { 
            el.disabled = false; 
            if(id === 'prodQty') el.value = '1';
            else el.value = ''; 
        }
    });

    let dropdown = document.getElementById('customProdDropdown');
    if(dropdown) dropdown.style.display = 'none';

    let actionRow = document.getElementById('finalBillActionRow');
    if(actionRow) actionRow.remove();
    if(document.getElementById('preview-section')) document.getElementById('preview-section').style.display = 'none';
    if(document.getElementById('final-bill-section')) document.getElementById('final-bill-section').style.display = 'none';
    if(document.getElementById('input-section')) document.getElementById('input-section').style.display = 'block';
    if(document.getElementById('historyTableContainer')) document.getElementById('historyTableContainer').style.display = 'block';
};

window.showFinalBill = function() {
    if(currentBillItems.length === 0) {
        alert("কোনো প্রোডাক্ট যুক্ত করা হয়নি!");
        return;
    }
    let finalBillSection = document.getElementById('final-bill-section');
    if (!finalBillSection) return;
    
    const sidebar = document.querySelector('.side-bar');
    const mainContent = document.querySelector('.main-content');
    if(sidebar) sidebar.style.display = 'none'; 
    if(mainContent) mainContent.style.marginLeft = '0'; 

    finalBillSection.innerHTML = '';
    
    let todayDate = getFormattedDate(); 

    let itemsPerPage = 20;
    let totalItems = currentBillItems.length;
    let totalPages = Math.ceil(totalItems / itemsPerPage);
    let grandTotal = currentBillItems.reduce((sum, item) => sum + item.total, 0);

    let translateWrapper = document.createElement('div');
    translateWrapper.className = "translate-wrapper no-print";
    translateWrapper.style.display = "flex";
    translateWrapper.style.justifyContent = "flex-end";
    translateWrapper.style.marginBottom = "15px";
    translateWrapper.innerHTML = `
        <button type="button" id="langToggleBtn" class="translate-btn" onclick="toggleLanguage()" style="background: ${currentLanguage === 'EN' ? '#00bfff' : '#2ecc71'}; color: #fff; border: none; padding: 8px 16px; font-size: 14px; font-weight: 600; border-radius: 20px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">Translate: ${currentLanguage}</button>
    `;
    finalBillSection.appendChild(translateWrapper);

    for (let p = 0; p < totalPages; p++) {
        let pageDiv = document.createElement('div');
        pageDiv.className = 'print-page-block';
        if (p > 0) {
            pageDiv.style.pageBreakBefore = 'always';
            pageDiv.style.marginTop = '20px';
        }

        let table = document.createElement('table');
        table.style.width = "100%";
        let tableHTML = "";

        if (p === 0) {
            tableHTML += `
                <tr>
                    <td colspan="6" style="border:none; padding: 10px 0;">
                        <div style="float:left; font-size: 22px; font-weight: bold;" class="bill-heading-text">SEKH BHANDAR</div>
                        <div style="clear:both; margin-bottom: 10px;"></div>
                        <hr style="border:0; border-top: 1px dashed #000; margin-bottom: 15px;">
                        <div style="float:left; text-align: left; font-size: 14px; line-height: 1.6;" class="bill-meta-text">
                            <strong>Billed To:</strong> ${capitalizeText(billPartyInfo.name)}<br>
                            <strong>Phone:</strong> ${billPartyInfo.phone || '-'}
                        </div>
                        <div style="float:right; text-align: right; font-size: 14px; line-height: 1.6;" class="bill-meta-text">
                            <strong>Address:</strong> ${billPartyInfo.address ? capitalizeText(billPartyInfo.address) : '-'}<br>
                            <strong>Date:</strong> ${todayDate}
                        </div>
                        <div style="clear:both;"></div>
                    </td>
                </tr>
            `;
        }

        tableHTML += `
            <tr style="background:#f2f2f2; color:black; font-weight:bold;">
                <td style="width: 8%;">Sl No</td>
                <td>Item</td>
                <td style="width: 15%;">MRP</td>
                <td style="width: 15%;">Qty</td>
                <td style="width: 15%;">Rate</td>
                <td style="width: 15%;">Amount</td>
            </tr>
        `;
        
        let startIdx = p * itemsPerPage;
        let endIdx = Math.min(startIdx + itemsPerPage, totalItems);
        for (let i = startIdx; i < endIdx; i++) {
            let item = currentBillItems[i];
            tableHTML += `
                <tr>
                    <td>${i + 1}</td>
                    <td style="text-align: left; padding-left: 10px;">
                        ${translateItemName(item.product)}
                    </td>
                    <td>${formatMRP(item.mrp)}</td>
                    <td>${item.qtyValue} ${item.unit}</td>
                    <td>${item.rate}</td>
                    <td>${item.total.toFixed(2)}</td>
                </tr>
            `;
        }

        if (p === totalPages - 1) {
            tableHTML += `
                <tr style="font-weight:bold; background:#f9f9f9;">
                    <td colspan="5" style="text-align:right; padding-right: 15px;">Total Amount:</td>
                    <td>${grandTotal.toFixed(2)}</td>
                </tr>
            `;
        }

        table.innerHTML = tableHTML;
        pageDiv.appendChild(table);
        finalBillSection.appendChild(pageDiv);
    }

    let actionRow = document.createElement('div');
    actionRow.id = 'finalBillActionRow';
    actionRow.style.marginTop = '25px';
    actionRow.className = "no-print";
    actionRow.innerHTML = `
        <button onclick="goBackToPreviewFromFinal()" style="padding: 8px 15px; background:#e67e22; color:white; margin-right:10px;">← Back to Preview</button>
        <button onclick="saveBillToHistory()" class="save" style="padding: 8px 15px; background:#2ecc71; color:white;">Confirm & Save Bill</button>
        <button onclick="window.print()" style="padding: 8px 15px; background:#3498db; color:white;">Print Bill</button>
        <button onclick="window.print()" style="padding: 8px 15px; background:#e74c3c; color:white;">PDF</button>
        <button onclick="clearCurrentBill()" class="cancel" style="padding: 8px 15px;">Cancel</button>
    `;
    finalBillSection.appendChild(actionRow);
    
    if(document.getElementById('preview-section')) document.getElementById('preview-section').style.display = 'none';
    finalBillSection.style.display = 'block';
};

window.goBackToPreviewFromFinal = function() {
    if(document.getElementById('final-bill-section')) document.getElementById('final-bill-section').style.display = 'none';
    let previewPage = document.getElementById('preview-section');
    if(previewPage) previewPage.style.display = 'block';
    renderPreviewTable();
};

// ==========================================
// ৭. বিল হিস্টোরি সংরক্ষণ (History Logic)
// ==========================================
window.saveBillToHistory = function() {
    if (currentBillItems.length === 0) return;
    let grandTotal = currentBillItems.reduce((sum, item) => sum + item.total, 0);
    let newBill = {
        party: billPartyInfo,
        items: [...currentBillItems],
        grandTotal: grandTotal.toFixed(2),
        date: new Date().toLocaleDateString()
    };
    if (editBillIndex !== null) {
        billsHistory[editBillIndex] = newBill;
        editBillIndex = null;
        alert("বিল সফলভাবে আপডেট হয়েছে!");
    } else {
        billsHistory.push(newBill);
        alert("বিল সফলভাবে হিস্টোরিতে সেভ হয়েছে!");
    }

    localStorage.setItem('billsHistory', JSON.stringify(billsHistory));
    updateDashboardCounts();
    renderBillsHistoryTable();
    clearCurrentBill();
};

function renderBillsHistoryTable() {
    let billsHistoryBody = document.getElementById('billsHistoryBody');
    if (!billsHistoryBody) return;
    billsHistoryBody.innerHTML = '';

    if (billsHistory.length === 0) {
        billsHistoryBody.innerHTML = `<tr><td colspan="4">No bills saved yet.</td></tr>`;
        return;
    }

    billsHistory.forEach((bill, index) => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${bill.date}</td>
            <td>${bill.party ? capitalizeText(bill.party.name) : 'Unknown'}</td>
            <td>${bill.grandTotal}</td>
            <td>
                <button class="save" onclick="editBill(${index})" style="padding: 5px 10px; margin:0; background:#3498db; color:white; border:none; cursor:pointer; border-radius:3px;">Edit</button>
                <button class="cancel" onclick="deleteBill(${index})" style="padding: 5px 10px; margin:0; background:#e74c3c; color:white; border:none; cursor:pointer; border-radius:3px;">Del</button>
            </td>
        `;
        billsHistoryBody.appendChild(tr);
    });
}

window.editBill = function(index) {
    editBillIndex = index;
    let bill = billsHistory[index];
    if (!bill) return;
    
    let partyNameEl = document.getElementById('partyName');
    let partyAddressEl = document.getElementById('partyAddress');
    let partyPhoneEl = document.getElementById('partyPhone');

    if (partyNameEl) partyNameEl.value = bill.party.name; 
    if (partyAddressEl) partyAddressEl.value = bill.party.address;
    if (partyPhoneEl) partyPhoneEl.value = bill.party.phone; 

    currentBillItems = [...bill.items];
    billPartyInfo = { ...bill.party };

    if (document.getElementById('input-section')) document.getElementById('input-section').style.display = 'block';
    if (document.getElementById('preview-section')) document.getElementById('preview-section').style.display = 'none';
    if (document.getElementById('final-bill-section')) document.getElementById('final-bill-section').style.display = 'none';
    if (document.getElementById('historyTableContainer')) document.getElementById('historyTableContainer').style.display = 'none';
    alert("বিলের ডাটা এডিটের জন্য লোড করা হয়েছে!");
};

window.deleteBill = function(index) {
    if (confirm("আপনি কি নিশ্চিত বিলটি ডিলিট করতে চান?")) {
        billsHistory.splice(index, 1);
        localStorage.setItem('billsHistory', JSON.stringify(billsHistory));
        updateDashboardCounts();
        renderBillsHistoryTable();
    }
};

// ইনিশিয়াল এক্সিকিউশন
renderParties();
renderProducts();
renderBillsHistoryTable();
updateDashboardCounts();
