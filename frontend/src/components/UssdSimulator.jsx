// UssdSimulator.jsx - Interactive visual simulator for basic phone USSD operations.
// Enables testing inventory checks, alerts, and quick sales in low-connectivity designs.

import React, { useState } from 'react'; // Import React library and useState hook.

// Props:
// - inventory: state array containing current drug records
// - setInventory: function to update inventory state
// - sales: state array containing transaction history
// - setSales: function to update sales history
// - triggerSmsAlert: function to dispatch simulated SMS notification
export default function UssdSimulator({ inventory, setInventory, sales, setSales, triggerSmsAlert }) {
  
  // 1. STATE MANAGEMENT
  // Is a USSD session currently active on the LCD screen?
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  // What is written in the main dial/command field.
  const [dialedCode, setDialedCode] = useState('*150*90#');
  
  // Tracks user text inputs inside active menus.
  const [currentInput, setCurrentInput] = useState('');
  
  // Tracks current menu tree node ('idle', 'main', 'stock', 'expiry', 'sale_select', 'sale_qty', 'sale_success', 'help').
  const [menuState, setMenuState] = useState('idle');
  
  // Tracks drug selected for quick sale simulation.
  const [saleMedicine, setSaleMedicine] = useState(null);

  // Tracks simulated money amounts for mobile money cash transfers.
  const [ussdAmount, setUssdAmount] = useState('10000');

  // System benchmark date (2026-06-23).
  const currentDate = new Date('2026-06-23');

  // 2. DIALER KEYPAD BUTTON HANDLERS
  // Triggered when clicking a digit on the phone face keypad.
  const handleKeypadPress = (val) => {
    if (!isSessionActive) {
      // If phone is idle, typing appends to the USSD dial code field.
      setDialedCode(prev => prev + val);
    } else {
      // If session is active, typing appends to the menu response input.
      setCurrentInput(prev => prev + val);
    }
  };

  // Clears the last character typed.
  const handleClear = () => {
    if (!isSessionActive) {
      setDialedCode(prev => prev.slice(0, -1));
    } else {
      setCurrentInput(prev => prev.slice(0, -1));
    }
  };

  // Resets the screen back to standard idle phone.
  const handleCancelSession = () => {
    setIsSessionActive(false);
    setMenuState('idle');
    setCurrentInput('');
    setSaleMedicine(null);
  };

  // 3. MENU SCREEN CALCULATIONS AND TEXT GENERATORS
  // Render text for the LCD display based on current menuState state.
  const getScreenText = () => {
    if (!isSessionActive) {
      return `Nokia Sim Link\n\nDial code to start:\n${dialedCode}\n\n[Press SEND]`;
    }

    switch (menuState) {
      
      // Main Entry Menu
      case 'main':
        return `CON PHARMASTAT INVENTORY\n1. Check Stock\n2. Expiry Alerts\n3. Quick Sale\n4. Support\n\nChoose option:`;

      // Option 1: Stock list display
      case 'stock':
        const stockList = inventory.map((item, idx) => `${idx + 1}. ${item.name.split(' ')[0]}: ${item.quantity}u`).join('\n');
        return `CON STOCK STATUS\n${stockList}\n\n99. Back`;

      // Option 2: Expiry alert statuses
      case 'expiry':
        const expired = inventory.filter(item => new Date(item.expiryDate) < currentDate);
        const near = inventory.filter(item => {
          const diff = Math.ceil((new Date(item.expiryDate) - currentDate) / (1000 * 60 * 60 * 24));
          return diff > 0 && diff <= 60;
        });
        return `CON EXPIRY REPORT\nExpired items: ${expired.length}\nExpiring <60d: ${near.length}\n\nPress 1 to list expired\n99. Back`;

      // Option 2.1: Listing expired batches specifically
      case 'expiry_list_expired':
        const expiredDetails = inventory
          .filter(item => new Date(item.expiryDate) < currentDate)
          .map((item, idx) => `${idx + 1}. ${item.name.split(' ')[0]} (${item.batchNumber})`)
          .join('\n') || "No expired items.";
        return `CON EXPIRED BATCHES\n${expiredDetails}\n\n99. Back`;

      // Option 3: Choose medicine for counter transaction
      case 'sale_select':
        const availableMeds = inventory.map((item, idx) => `${idx + 1}. ${item.name.split(' ')[0]} (Stock: ${item.quantity})`).join('\n');
        return `CON SELECT MEDICINE\n${availableMeds}\n\n99. Back`;

      // Option 3.1: Input quantity for quick sale
      case 'sale_qty':
        return `CON RECORD SALE\nSelected: ${saleMedicine.name.split(' ')[0]}\nPrice: TSh ${saleMedicine.unitPrice.toLocaleString()}\nStock: ${saleMedicine.quantity} units\n\nEnter Quantity to Sell:`;

      // Option 3.2: Success feedback message
      case 'sale_success':
        return `END TRANSACTION OK\nSale recorded!\nTotal: TSh ${(saleMedicine.unitPrice * parseInt(currentInput)).toLocaleString()}\nSMS Receipt sent.\n\n[Session ended]`;

      // Option 4: Assistance text
      case 'help':
        return `CON PHARMASTAT HELP\nCall: +255 754 123 456\nSMS 'HELP' to 20401\nEast Africa Pharmacy Project\n\n99. Back`;

      // Tanzanian Vodacom M-Pesa Simulated USSD Screen Flow (*150*00#)
      case 'mpesa':
        return `CON M-PESA VODACOM\n1. Tuma Pesa (Send Money)\n2. Lipa kwa M-Pesa (Pay Merchant)\n3. Salio la Account (Balance)\n\nChoose option:`;
      case 'mpesa_send_phone':
        return `CON TUMA PESA\nEnter Recipient Phone Number:\n(e.g., 0754XXXXXX)`;
      case 'mpesa_send_amount':
        return `CON TUMA PESA\nEnter Amount to Send (TSh):`;
      case 'mpesa_send_confirm':
        return `CON TUMA PESA\nEnter M-Pesa PIN to Send TSh ${parseInt(ussdAmount).toLocaleString()} to phone:\n(Enter any 4-digit PIN)`;
      case 'mpesa_lipa_merchant':
        return `CON LIPA KWA M-PESA\nEnter Lipa/Merchant Number:\n(e.g., 556677)`;
      case 'mpesa_success':
        return `END M-PESA VODACOM\nTransaction Complete!\nTSh ${parseInt(ussdAmount).toLocaleString()} sent successfully.\nRef: MP-82193K9. SMS sent.\n\n[Session ended]`;
      case 'mpesa_balance':
        return `END M-PESA SALIO\nYour Vodacom M-Pesa balance is TSh 350,000.\nAccount active.\nRef: BAL-82103.\n\n[Session ended]`;

      // Tanzanian Tigo Pesa Simulated USSD Screen Flow (*150*01#)
      case 'tigopesa':
        return `CON TIGO PESA\n1. Send Money\n2. Pay Merchant\n3. Tigo Pesa Balance\n\nChoose option:`;
      case 'tigopesa_balance':
        return `END TIGO PESA\nYour Tigo Pesa balance is TSh 185,000.\nRef: TG-90123.\n\n[Session ended]`;

      // Tanzanian Airtel Money Simulated USSD Screen Flow (*150*60#)
      case 'airtel':
        return `CON AIRTEL MONEY\n1. Send Cash\n2. Lipa Bill\n3. Airtel Balance\n\nChoose option:`;
      case 'airtel_balance':
        return `END AIRTEL MONEY\nYour Airtel Money balance is TSh 220,000.\nRef: AM-40192.\n\n[Session ended]`;

      // Tanzanian HaloPesa Simulated USSD Screen Flow (*150*88#)
      case 'halopesa':
        return `CON HALOPESA\n1. Halo Send\n2. Lipa Hapa\n3. HaloPesa Balance\n\nChoose option:`;
      case 'halopesa_balance':
        return `END HALOPESA\nYour HaloPesa balance is TSh 95,000.\nRef: HP-38291.\n\n[Session ended]`;

      default:
        return `CON Unknown system menu state.\n\n99. Back`;
    }
  };

  // 4. USSD SCREEN FORM SUBMISSION ACTION
  // Triggered when pressing the 'SEND/DIAL' key.
  const handleDialSend = () => {
    
    // Scenario A: Phone is idle, dialing system USSD code to start session
    if (!isSessionActive) {
      const code = dialedCode.trim();
      // Valid list of Tanzanian USSD codes supported by this emulator.
      const validCodes = ['*150*90#', '*150*00#', '*150*01#', '*150*60#', '*150*88#'];
      
      if (validCodes.includes(code)) {
        setIsSessionActive(true);
        if (code === '*150*90#') setMenuState('main');
        else if (code === '*150*00#') setMenuState('mpesa');
        else if (code === '*150*01#') setMenuState('tigopesa');
        else if (code === '*150*60#') setMenuState('airtel');
        else if (code === '*150*88#') setMenuState('halopesa');
      } else {
        alert("Invalid USSD code! Please dial Tanzanian codes: *150*90# for PharmaStat, *150*00# for M-Pesa, *150*01# for Tigo Pesa, *150*60# for Airtel, or *150*88# for HaloPesa.");
      }
      return;
    }

    // Scenario B: Session is active, validating option inputs
    const input = currentInput.trim();
    setCurrentInput(''); // Clear screen input field for next command.

    // Global back command.
    if (input === '99') {
      if (menuState === 'expiry_list_expired') {
        setMenuState('expiry');
      } else if (menuState === 'sale_qty') {
        setMenuState('sale_select');
      } else if (['mpesa_send_phone', 'mpesa_lipa_merchant', 'mpesa_send_amount', 'mpesa_send_confirm'].includes(menuState)) {
        setMenuState('mpesa');
      } else {
        setMenuState('main');
      }
      return;
    }

    // Evaluate input based on which menu screen is loaded.
    switch (menuState) {
      
      // Main Menu navigation tree
      case 'main':
        if (input === '1') setMenuState('stock');
        else if (input === '2') setMenuState('expiry');
        else if (input === '3') setMenuState('sale_select');
        else if (input === '4') setMenuState('help');
        else alert("Invalid choice. Enter 1, 2, 3, or 4.");
        break;

      // Expiry submenu choices
      case 'expiry':
        if (input === '1') {
          setMenuState('expiry_list_expired');
        } else {
          alert("Invalid choice. Enter 1 to list expired or 99 to go back.");
        }
        break;

      // Quick sale medicine selection
      case 'sale_select':
        const medIndex = parseInt(input) - 1;
        if (medIndex >= 0 && medIndex < inventory.length) {
          const med = inventory[medIndex];
          if (med.quantity <= 0) {
            alert(`Unable to sell ${med.name}. Stock is out!`);
          } else {
            setSaleMedicine(med);
            setMenuState('sale_qty');
          }
        } else {
          alert("Invalid index selection.");
        }
        break;

      // Quick sale quantity submission
      case 'sale_qty':
        const qty = parseInt(input);
        if (isNaN(qty) || qty <= 0) {
          alert("Please enter a valid positive quantity number.");
          return;
        }
        if (qty > saleMedicine.quantity) {
          alert(`Insufficient stock! Max available: ${saleMedicine.quantity} units.`);
          return;
        }

        // DYNAMIC STATE UPDATE: Deduct stock and write sale logs inside simulator!
        const total = saleMedicine.unitPrice * qty;
        const newSaleId = `SAL-90${sales.length + 1}`;
        const newSale = {
          saleId: newSaleId,
          timestamp: currentDate.toISOString(),
          medicineId: saleMedicine.id,
          medicineName: saleMedicine.name,
          quantity: qty,
          unitPrice: saleMedicine.unitPrice,
          totalCost: total,
          paymentMethod: 'USSD Mobile Money'
        };

        // Update global stock quantities.
        const updatedInventory = inventory.map(item => {
          if (item.id === saleMedicine.id) {
            const newQty = item.quantity - qty;
            
            // Check thresholds.
            if (newQty <= item.lowStockThreshold) {
              triggerSmsAlert("Store Manager", `WARNING: Stock critical. USSD quick sale drops ${item.name} quantity to ${newQty} units.`);
            }

            return {
              ...item,
              quantity: newQty
            };
          }
          return item;
        });

        // Write updates.
        setInventory(updatedInventory);
        setSales([newSale, ...sales]);

        // Send simulated customer transaction success SMS.
        triggerSmsAlert(
          "Customer / Patient", 
          `Confirm: TSh ${total.toLocaleString()} paid to PHARMASTAT for ${qty} x ${saleMedicine.name.split(' ')[0]}. Reference: ${newSaleId}.`
        );

        // Advance to success display screen (soft ending USSD session).
        setMenuState('sale_success');
        break;

      // Vodacom M-Pesa simulated transitions
      case 'mpesa':
        if (input === '1') setMenuState('mpesa_send_phone');
        else if (input === '2') setMenuState('mpesa_lipa_merchant');
        else if (input === '3') setMenuState('mpesa_balance');
        else alert("Invalid option. Choose 1, 2, or 3.");
        break;

      case 'mpesa_send_phone':
        if (input.length >= 8) {
          setMenuState('mpesa_send_amount');
        } else {
          alert("Please enter a valid phone number.");
        }
        break;

      case 'mpesa_lipa_merchant':
        if (input.length >= 4) {
          setMenuState('mpesa_send_amount');
        } else {
          alert("Please enter a valid Lipa Merchant Code.");
        }
        break;

      case 'mpesa_send_amount':
        const valAmount = parseInt(input);
        if (valAmount > 0) {
          setUssdAmount(input);
          setMenuState('mpesa_send_confirm');
        } else {
          alert("Please enter a valid amount.");
        }
        break;

      case 'mpesa_send_confirm':
        if (input.length >= 4) {
          // Trigger Vodacom Transaction SMS.
          triggerSmsAlert(
            "Vodacom M-Pesa",
            `LIPA: TSh ${parseInt(ussdAmount).toLocaleString()} paid successfully. Ref: MP-98103A. Balance: TSh 280,000.`
          );
          setMenuState('mpesa_success');
        } else {
          alert("Please enter your PIN.");
        }
        break;

      // Tigo Pesa simulated transitions
      case 'tigopesa':
        if (input === '1') setMenuState('mpesa_send_phone');
        else if (input === '2') setMenuState('mpesa_lipa_merchant');
        else if (input === '3') setMenuState('tigopesa_balance');
        else alert("Invalid choice. Select 1, 2, or 3.");
        break;

      // Airtel Money simulated transitions
      case 'airtel':
        if (input === '1') setMenuState('mpesa_send_phone');
        else if (input === '2') setMenuState('mpesa_lipa_merchant');
        else if (input === '3') setMenuState('airtel_balance');
        else alert("Invalid choice. Select 1, 2, or 3.");
        break;

      // HaloPesa simulated transitions
      case 'halopesa':
        if (input === '1') setMenuState('mpesa_send_phone');
        else if (input === '2') setMenuState('mpesa_lipa_merchant');
        else if (input === '3') setMenuState('halopesa_balance');
        else alert("Invalid choice. Select 1, 2, or 3.");
        break;

      // Exiting mobile money balances/confirmations on click
      case 'mpesa_success':
      case 'mpesa_balance':
      case 'tigopesa_balance':
      case 'airtel_balance':
      case 'halopesa_balance':
      case 'sale_success':
        handleCancelSession();
        break;

      default:
        setMenuState('main');
        break;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Title block */}
      <div>
        <h3 style={{ fontSize: '1.25rem', fontFamily: 'Outfit, sans-serif', marginBottom: '8px' }}>
          Interactive USSD Mobile Emulator
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Simulates offline USSD text interfaces. Enter commands using the visual keypad below.
        </p>
      </div>

      {/* Phone chassis structure */}
      <div className="phone-mockup">
        
        {/* Physical speaker notch at top of phone */}
        <div className="phone-speaker"></div>

        {/* Nostalgic green LCD layout screen */}
        <div className="phone-screen">
          {/* Main LCD screen content */}
          <div className="screen-text">
            {getScreenText()}
          </div>

          {/* Prompt input row shown if a session is currently active */}
          {isSessionActive && menuState !== 'sale_success' && (
            <div className="screen-input-row">
              <span className="screen-input-prompt">Ans:</span>
              <input 
                type="text" 
                className="screen-input-field" 
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Action button controls above keypad dialer */}
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', padding: '0 15px', marginTop: '15px' }}>
          
          {/* Cancel/Clear button */}
          <button 
            onClick={isSessionActive ? handleCancelSession : () => setDialedCode('')}
            style={{ 
              background: '#ef4444', 
              color: 'white', 
              border: 'none', 
              padding: '6px 16px', 
              borderRadius: '20px', 
              fontSize: '0.75rem', 
              fontWeight: 'bold', 
              cursor: 'pointer' 
            }}
          >
            {isSessionActive ? "EXIT" : "RESET"}
          </button>

          {/* Dial/Send button */}
          <button 
            onClick={handleDialSend}
            style={{ 
              background: '#10b981', 
              color: 'black', 
              border: 'none', 
              padding: '6px 16px', 
              borderRadius: '20px', 
              fontSize: '0.75rem', 
              fontWeight: 'bold', 
              cursor: 'pointer' 
            }}
          >
            SEND
          </button>

        </div>

        {/* Interactive Number Keys */}
        <div className="phone-keypad">
          
          {/* Key row 1 */}
          <button className="keypad-btn" onClick={() => handleKeypadPress('1')}>
            <span className="keypad-num">1</span>
            <span className="keypad-letters">o_o</span>
          </button>
          <button className="keypad-btn" onClick={() => handleKeypadPress('2')}>
            <span className="keypad-num">2</span>
            <span className="keypad-letters">abc</span>
          </button>
          <button className="keypad-btn" onClick={() => handleKeypadPress('3')}>
            <span className="keypad-num">3</span>
            <span className="keypad-letters">def</span>
          </button>

          {/* Key row 2 */}
          <button className="keypad-btn" onClick={() => handleKeypadPress('4')}>
            <span className="keypad-num">4</span>
            <span className="keypad-letters">ghi</span>
          </button>
          <button className="keypad-btn" onClick={() => handleKeypadPress('5')}>
            <span className="keypad-num">5</span>
            <span className="keypad-letters">jkl</span>
          </button>
          <button className="keypad-btn" onClick={() => handleKeypadPress('6')}>
            <span className="keypad-num">6</span>
            <span className="keypad-letters">mno</span>
          </button>

          {/* Key row 3 */}
          <button className="keypad-btn" onClick={() => handleKeypadPress('7')}>
            <span className="keypad-num">7</span>
            <span className="keypad-letters">pqrs</span>
          </button>
          <button className="keypad-btn" onClick={() => handleKeypadPress('8')}>
            <span className="keypad-num">8</span>
            <span className="keypad-letters">tuv</span>
          </button>
          <button className="keypad-btn" onClick={() => handleKeypadPress('9')}>
            <span className="keypad-num">9</span>
            <span className="keypad-letters">wxyz</span>
          </button>

          {/* Key row 4 */}
          <button className="keypad-btn" onClick={() => handleKeypadPress('*')}>
            <span className="keypad-num">*</span>
            <span className="keypad-letters"></span>
          </button>
          <button className="keypad-btn" onClick={() => handleKeypadPress('0')}>
            <span className="keypad-num">0</span>
            <span className="keypad-letters">+</span>
          </button>
          <button className="keypad-btn" onClick={() => handleKeypadPress('#')}>
            <span className="keypad-num">#</span>
            <span className="keypad-letters"></span>
          </button>

        </div>

      </div>

    </div>
  );
}
