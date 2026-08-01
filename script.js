<script type="module">
  // ==========================================
  // ১. Firebase Initialization & Database Setup
  // ==========================================
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
  import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

  // ==========================================
  // ২. 4-Digit Session ID & Mobile Realtime Listener
  // ==========================================
  // ৪ অক্ষরের সেশন আইডি তৈরি (যেমন: 5821)
  const currentSessionId = Math.floor(1000 + Math.random() * 9000).toString();

  // স্ক্রিনে Session ID প্রদর্শনের জন্য এলিমেন্ট সেট আপ
  window.addEventListener('DOMContentLoaded', () => {
      let sessionDisplayEl = document.getElementById('sessionDisplay');
      if (!sessionDisplayEl) {
          sessionDisplayEl = document.createElement('div');
          sessionDisplayEl.id = 'sessionDisplay';
          sessionDisplayEl.style.cssText = "position: fixed; top: 10px; right: 20px; background: #0091ff; color: white; padding: 8px 15px; border-radius: 20px; font-weight: bold; font-size: 16px; z-index: 9999; box-shadow: 0 4px 10px rgba(0,0,0,0.2);";
          document.body.appendChild(sessionDisplayEl);
      }
      sessionDisplayEl.innerText = `Mobile Session ID: ${currentSessionId}`;
  });

  // মোবাইল থেকে আসা বারকোড রিসেভ করা
  const scannedBarcodeRef = ref(db, `scanned_barcodes/${currentSessionId}`);
  onValue(scannedBarcodeRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.barcode) {
          let barcodeInput = document.getElementById('prodBarcode');
          if (barcodeInput) {
              barcodeInput.value = data.barcode;
              // ইনপুট ট্রিগার করে প্রোডাক্ট সার্চ করা
              barcodeInput.dispatchEvent(new Event('input'));
          }
      }
  });

  // ==========================================
  // ৩. Page Navigation & State
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

      if (pageId === 'api') renderApiPageTable();
  };

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
      if (!mrpValue || mrpValue === "0" || parseFloat(mrpValue) === 0) return "-";
      return mrpValue;
  }

  // ==========================================
  // ৪. Firebase Data State & Sync
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
      renderParties();
  });

  onValue(ref(db, 'products'), (snapshot) => {
      products = snapshot.val() || [];
      renderProducts();
  });

  onValue(ref(db, 'billsHistory'), (snapshot) => {
      billsHistory = snapshot.val() || [];
      renderBillsHistoryTable();
  });

  onValue(ref(db, 'banglaMappings'), (snapshot) => {
      banglaMappings = snapshot.val() || {};
      renderApiPageTable();
  });

  function savePartiesToDB() { set(ref(db, 'parties'), parties); }
  function saveProductsToDB() { set(ref(db, 'products'), products); }
  function saveBillsToDB() { set(ref(db, 'billsHistory'), billsHistory); }
  function saveBanglaMappingsToDB() { set(ref(db, 'banglaMappings'), banglaMappings); }

  // ==========================================
  // ৫. Party Logic (Edit, Delete, Save)
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
                  <button class="save" onclick="editParty(${index})" style="padding: 5px 10px; background:#3498db; color:white; border:none; cursor:pointer; border-radius:3px;">Edit</button>
                  <button class="cancel" onclick="deleteParty(${index})" style="padding: 5px 10px; background:#e74c3c; color:white; border:none; cursor:pointer; border-radius:3px;">Del</button>
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
  // ৬. Storage Product Logic
  // ==========================================
  const storageNameInput = document.getElementById('storageProdName');
  const storageBarcodeInput = document.getElementById('storageBarcode');
  const storageRateInput = document.querySelector('#storages input[placeholder="rate"]');
  const storageMrpInput = document.querySelector('#storages input[placeholder="MRP"]');
  const storageSelect = document.querySelector('#storages select');
  const saveProductBtn = document.querySelector('#storages .save');
  const productList = document.querySelector('#storages table tbody');

  function renderProducts(filterText = "") {
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
                  <button class="save" onclick="editProduct(${index})" style="padding: 5px 10px; background:#3498db; color:white; border:none; cursor:pointer; border-radius:3px;">Edit</button>
                  <button class="cancel" onclick="deleteProduct(${index})" style="padding: 5px 10px; background:#e74c3c; color:white; border:none; cursor:pointer; border-radius:3px;">Del</button>
              </td>
          `;
          productList.appendChild(tr);
      });
      updateDashboardCounts();
      populateBillsDropdowns();
  }

  if(saveProductBtn && storageSelect) {
      saveProductBtn.onclick = function() {
          let name = storageNameInput.value.trim();
          let barcode = storageBarcodeInput.value.trim();
          let rate = storageRateInput.value.trim();
          let mrp = storageMrpInput.value.trim() !== "" ? storageMrpInput.value.trim() : "0";
          let unit = storageSelect.value;

          if(name === "" || rate === "") { alert("Product Name and Rate required!"); return; }

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
  // ৭. Dropdown & Auto Fill from Barcode
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
                  
                  addToPreview(true);
              }
          };
      }
  }

  // ==========================================
  // ৮. Invoice Billing & Create Final Bill
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
      if(prodName === "" || isNaN(prodRate)) { if(!isAutoScan) alert("Enter Valid Name and Rate!"); return; }

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

      // Clear Product Inputs
      prodNameEl.value = '';
      if(prodBarcodeEl) prodBarcodeEl.value = '';
      prodRateEl.value = '';
      if(prodMrpEl) prodMrpEl.value = '';
      if(prodQtyEl) prodQtyEl.value = '1';

      renderBillPreviewTable();
  };

  function renderBillPreviewTable() {
      let previewTable = document.getElementById('billPreviewBody');
      if (!previewTable) return;
      previewTable.innerHTML = '';

      currentBillItems.forEach((item, idx) => {
          let tr = document.createElement('tr');
          tr.innerHTML = `
              <td>${item.product}</td>
              <td>${item.qtyValue} ${item.unit}</td>
              <td>${item.rate}</td>
              <td>${item.total.toFixed(2)}</td>
              <td><button onclick="removePreviewItem(${idx})" style="background:#e74c3c; color:#fff; border:none; padding:3px 8px; border-radius:3px; cursor:pointer;">X</button></td>
          `;
          previewTable.appendChild(tr);
      });
  }

  window.removePreviewItem = function(idx) {
      currentBillItems.splice(idx, 1);
      renderBillPreviewTable();
  };

  // "Create Final Bill" بٹن کا کام
  window.createFinalBill = function() {
      if (currentBillItems.length === 0) {
          alert("বিলের মধ্যে কোনো প্রোডাক্ট নেই!");
          return;
      }

      let grandTotal = currentBillItems.reduce((sum, item) => sum + item.total, 0);

      // Final Bill Display UI আপডেট করা
      if (document.getElementById('finalPartyName')) document.getElementById('finalPartyName').innerText = capitalizeText(billPartyInfo.name);
      if (document.getElementById('finalPartyAddress')) document.getElementById('finalPartyAddress').innerText = billPartyInfo.address;
      if (document.getElementById('finalPartyPhone')) document.getElementById('finalPartyPhone').innerText = billPartyInfo.phone;
      if (document.getElementById('finalGrandTotal')) document.getElementById('finalGrandTotal').innerText = grandTotal.toFixed(2);

      let finalItemsTable = document.getElementById('finalBillItemsBody');
      if (finalItemsTable) {
          finalItemsTable.innerHTML = '';
          currentBillItems.forEach((item, i) => {
              let tr = document.createElement('tr');
              tr.innerHTML = `
                  <td>${i + 1}</td>
                  <td>${item.product}</td>
                  <td>${item.mrp !== "0" ? item.mrp : '-'}</td>
                  <td>${item.qtyValue} ${item.unit}</td>
                  <td>${item.rate}</td>
                  <td>${item.total.toFixed(2)}</td>
              `;
              finalItemsTable.appendChild(tr);
          });
      }

      // UI Switch to Final Bill Section
      if (document.getElementById('input-section')) document.getElementById('input-section').style.display = 'none';
      if (document.getElementById('final-bill-section')) document.getElementById('final-bill-section').style.display = 'block';
  };

  window.saveBillToHistory = function() {
      if (currentBillItems.length === 0) return;
      let grandTotal = currentBillItems.reduce((sum, item) => sum + item.total, 0);
      
      let newBill = {
          party: billPartyInfo,
          items: [...currentBillItems],
          grandTotal: grandTotal.toFixed(2),
          date: new Date().toLocaleDateString()
      };

      billsHistory.push(newBill);
      saveBillsToDB();

      alert("বিল সেভ হয়েছে!");
      currentBillItems = [];
      renderBillPreviewTable();
      if (document.getElementById('final-bill-section')) document.getElementById('final-bill-section').style.display = 'none';
      if (document.getElementById('input-section')) document.getElementById('input-section').style.display = 'block';
  };

  function renderBillsHistoryTable() {
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
                  <button class="cancel" onclick="deleteBill(${index})" style="padding: 5px 10px; background:#e74c3c; color:white; border:none; cursor:pointer; border-radius:3px;">Del</button>
              </td>
          `;
          billsHistoryBody.appendChild(tr);
      });
  }

  window.deleteBill = function(index) {
      if (confirm("বিলটি ডিলিট করতে চান?")) {
          billsHistory.splice(index, 1);
          saveBillsToDB();
      }
  };

  function renderApiPageTable() { /* Translation table renderer */ }
</script>
