<script type="module">
  // ==========================================
  // Firebase SDK ইম্পোর্ট ও কনফিগারেশন
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
    appId: "1:835471865300:web:6fcfb66e29bfc97f4a9241",
    measurementId: "G-Q7BN12BLP9"
  };

  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  // ==========================================
  // ১. পেজ নেভিগেশন ও গ্লোবাল স্টেট
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

      if (pageId === 'api') {
          renderApiPageTable();
      }
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
      if (!mrpValue || mrpValue === "0" || parseFloat(mrpValue) === 0) {
          return "-";
      }
      return mrpValue;
  }

  // ==========================================
  // ২. Firebase ডাটা সিঙ্ক্রোনাইজেশন
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

  // Realtime Database থেকে ডাটা লোড
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

  function savePartiesToDB() {
      set(ref(db, 'parties'), parties);
  }

  function saveProductsToDB() {
      set(ref(db, 'products'), products);
  }

  function saveBillsToDB() {
      set(ref(db, 'billsHistory'), billsHistory);
  }

  function saveBanglaMappingsToDB() {
      set(ref(db, 'banglaMappings'), banglaMappings);
  }

  // ==========================================
  // ৩. ট্রান্সলেশন ও API লজিক
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

  window.saveBanglaTranslation = function(englishName, buttonElement) {
      let inputField = buttonElement.parentElement.querySelector('.api-bangla-input');
      let banglaValue = inputField.value.trim();

      if (banglaValue === "") {
          alert("অনুগ্রহ করে একটি বাংলা নাম লিখুন!");
          return;
      }

      let cleanKey = englishName.trim().toLowerCase();
      banglaMappings[cleanKey] = banglaValue;
      saveBanglaMappingsToDB();

      let originalText = buttonElement.innerText;
      buttonElement.innerText = "SAVED ✓";
      buttonElement.style.background = "#00bfff";
      
      setTimeout(() => {
          buttonElement.innerText = originalText;
          buttonElement.style.background = "#2ecc71";
      }, 1500);
  };

  // ==========================================
  // ৪. পার্টি ম্যানেজমেন্ট (Party Logic)
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

          savePartiesToDB();
          clearPartyInputs();
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

  const searchPartyInput = document.getElementById('searchParty');
  if (searchPartyInput) {
      searchPartyInput.addEventListener('input', function() {
          renderParties(this.value.trim());
      });
  }

  // ==========================================
  // ৫. প্রোডাক্ট ম্যানেজমেন্ট (Storage Logic)
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

          saveProductsToDB();
          clearStorageInputs();
      };
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
  // ৬. ড্রপডাউন এবং বারকোড স্ক্যান লজিক
  // ==========================================
  function populateBillsDropdowns() {
      let partyNameInput = document.getElementById('partyName');
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
                  if(document.getElementById('partyAddress')) document.getElementById('partyAddress').value = selectedParty.address || "";
                  if(document.getElementById('partyPhone')) document.getElementById('partyPhone').value = selectedParty.phone || "";
              }
          };
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
      }
  }

  // ==========================================
  // ৭. ইনভয়েস বিলিং ও সেভ সিস্টেম
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

      currentBillItems.push({ 
          product: prodName, 
          barcode: prodBarcode, 
          mrp: prodMrp, 
          rate: prodRate, 
          qtyValue: qtyAmount, 
          unit: prodQtyUnit, 
          total: total 
      });

      // Clear Inputs
      prodNameEl.value = '';
      if(prodBarcodeEl) prodBarcodeEl.value = '';
      prodRateEl.value = '';
      if(prodMrpEl) prodMrpEl.value = '';
      if(prodQtyEl) prodQtyEl.value = '1';
      if(prodBarcodeEl) prodBarcodeEl.focus();
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
      if (editBillIndex !== null) {
          billsHistory[editBillIndex] = newBill;
          editBillIndex = null;
          alert("বিল সফলভাবে আপডেট হয়েছে!");
      } else {
          billsHistory.push(newBill);
          alert("বিল সফলভাবে Firebase-এ সেভ হয়েছে!");
      }

      saveBillsToDB();
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

  window.deleteBill = function(index) {
      if (confirm("আপনি কি নিশ্চিত বিলটি ডিলিট করতে চান?")) {
          billsHistory.splice(index, 1);
          saveBillsToDB();
      }
  };

</script>
