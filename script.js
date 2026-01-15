(function () {
    const currencyConfig = {

        INR: {
            symbol: "₹", decimals: 0, indian: true, name: "Rupees"
        }

        ,
        USD: {
            symbol: "$", decimals: 2, indian: false, name: "Dollars"
        }

        ,
        EUR: {
            symbol: "€", decimals: 2, indian: false, name: "Euros"
        }

        ,
        AED: {
            symbol: "د.إ", decimals: 2, indian: false, name: "Dirhams"
        }

        ,
        GBP: {
            symbol: "£", decimals: 2, indian: false, name: "Pounds"
        }

        ,
        SGD: {
            symbol: "S$", decimals: 2, indian: false, name: "Dollars"
        }

        ,
        CAD: {
            symbol: "C$", decimals: 2, indian: false, name: "Dollars"
        }

        ,
        JPY: {
            symbol: "¥", decimals: 0, indian: false, name: "Yen"
        }

        ,
    }

        ;

    let currentCurrency = "INR";
    let recalcTimeout = null;
    const appRoot = document.getElementById("sip-swp-app");

    let currentTheme = "dark";
    let simpleView = false;

    try {
        const storedTheme = window.localStorage.getItem("financeCalcTheme");

        if (storedTheme === "light" || storedTheme === "dark") {
            currentTheme = storedTheme;
        }

        const storedView = window.localStorage.getItem("financeCalcView");

        if (storedView === "simple" || storedView === "advanced") {
            simpleView = storedView === "simple";
        }
    }

    catch (e) {
        // ignore storage errors
    }

    // Debounce function for calculations
    function debounce(func, wait) {
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(recalcTimeout);
                func(...args);
            }

                ;
            clearTimeout(recalcTimeout);
            recalcTimeout = setTimeout(later, wait);
        }

            ;
    }

    function parseNumber(str) {
        if (!str) return 0;
        const cleaned = String(str).replace(/, /g, "").trim();
        const val = parseFloat(cleaned);
        return isNaN(val) || !isFinite(val) ? 0 : Math.max(0, val);
    }

    function validateInput(value, min = 0, max = Infinity, fieldName = "") {
        if (value < min) return {
            valid: false, error: `${
                    fieldName
                }

                must be at least ${
                    min
                }

                `
        }

            ;

        if (value > max) return {
            valid: false, error: `${
                    fieldName
                }

                exceeds maximum ${
                    max
                }

                `
        }

            ;

        if (!isFinite(value)) return {
            valid: false, error: `${
                    fieldName
                }

                must be a valid number`
        }

            ;

        return {
            valid: true, error: null
        }

            ;
    }

    function applyTheme(theme) {
        currentTheme = theme === "light" ? "light" : "dark";

        if (currentTheme === "light") {
            appRoot.classList.add("theme-light");
        }

        else {
            appRoot.classList.remove("theme-light");
        }

        try {
            window.localStorage.setItem("financeCalcTheme", currentTheme);
        }

        catch (e) { }

        const themeToggle = document.getElementById("themeToggle");

        if (themeToggle) {
            themeToggle.querySelectorAll("button").forEach((btn) => btn.classList.toggle("active", btn.dataset.theme === currentTheme));
        }
    }

    function applyViewMode(mode) {
        simpleView = mode === "simple";
        appRoot.classList.toggle("simple-view", simpleView);

        try {
            window.localStorage.setItem("financeCalcView",
                simpleView ? "simple" : "advanced"
            );
        }

        catch (e) { }

        const viewToggle = document.getElementById("viewModeToggle");

        if (viewToggle) {
            viewToggle.querySelectorAll("button").forEach((btn) => btn.classList.toggle("active", btn.dataset.view === (simpleView ? "simple" : "advanced")));
        }
    }

    function formatIndian(num, decimals) {
        const fixed = num.toFixed(decimals);
        const parts = fixed.split(".");
        let x = parts[0];
        const lastThree = x.slice(-3);
        const other = x.slice(0, -3);

        if (other !== "") x = other.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
        return parts.length > 1 && decimals > 0 ? x + "." + parts[1] : x;
    }

    function formatNumber(num, currencyCode, withSymbol = true) {
        const cfg = currencyConfig[currencyCode || currentCurrency] || currencyConfig.INR;
        const decimals = cfg.decimals;
        if (!isFinite(num) || isNaN(num)) return withSymbol ? cfg.symbol + "0" : "0";
        // Handle very large numbers
        if (Math.abs(num) > 1e15) return withSymbol ? cfg.symbol + "∞" : "∞";
        const abs = Math.abs(num);
        const sign = num < 0 ? "-" : "";
        let body;

        if (cfg.indian) {
            body = formatIndian(abs, decimals);
        }

        else {
            body = abs.toLocaleString("en-US", {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
            });
        }

        return (withSymbol ? cfg.symbol : "") + sign + body;
    }

    function formatInputWithCommas(input) {
        const raw = input.value;
        const cfg = currencyConfig[currentCurrency] || currencyConfig.INR;
        // Allow decimals for percentage/rate fields (inputmode="decimal")
        const allowsDecimals = input.getAttribute("inputmode") === "decimal";
        const decimals = allowsDecimals ? 2 : cfg.decimals;
        const cleaned = raw.replace(/, /g, "").replace(/[^\d.]/g, "");

        if (!cleaned) {
            input.dataset.raw = "";
            input.value = "";
            return;
        }

        let parts = cleaned.split(".");
        let intPart = parts[0];
        let decPart = parts[1] || "";
        // Check if user is in the middle of typing a decimal (e.g., "12.")
        const hasTrailingDot = raw.trim().endsWith(".") && cleaned.includes(".");

        if (decimals === 0 && !allowsDecimals) {
            decPart = "";
        }

        else if (decPart.length > decimals) {
            decPart = decPart.slice(0, decimals);
        }

        const num = parseFloat(intPart + (decPart ? "." + decPart : ""));

        if (isNaN(num) && intPart === "") {
            input.dataset.raw = "";
            input.value = "";
            return;
        }

        // Preserve the number even if it's just "0" or empty intPart
        const finalNum = isNaN(num) ? 0 : num;
        input.dataset.raw = String(finalNum);
        let formattedInt;

        if (cfg.indian) {
            formattedInt = formatIndian(Number(intPart || "0"), 0);
        }

        else {
            formattedInt = Number(intPart || "0").toLocaleString("en-US", {
                maximumFractionDigits: 0,
            });
        }

        // Preserve trailing dot if user just typed it
        if (hasTrailingDot && allowsDecimals && !decPart) {
            input.value = formattedInt + ".";
        }

        else {
            input.value = formattedInt + (decPart && (decimals > 0 || allowsDecimals) ? "." + decPart : "");
        }
    }

    function numberToWords(num, currencyCode) {
        num = Math.floor(num);
        if (num === 0) return "zero";
        const cfg = currencyConfig[currencyCode || currentCurrency] || currencyConfig.INR;
        const currencyName = cfg.name || "units";

        const a = ["",
            "one",
            "two",
            "three",
            "four",
            "five",
            "six",
            "seven",
            "eight",
            "nine",
            "ten",
            "eleven",
            "twelve",
            "thirteen",
            "fourteen",
            "fifteen",
            "sixteen",
            "seventeen",
            "eighteen",
            "nineteen",
        ];
        const b = ["",
            "",
            "twenty",
            "thirty",
            "forty",
            "fifty",
            "sixty",
            "seventy",
            "eighty",
            "ninety",
        ];

        function inWords(n) {
            if (n < 20) return a[n];

            if (n < 100) {
                return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
            }

            if (n < 1000) {
                return (a[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + inWords(n % 100) : ""));
            }

            if (n < 100000) {
                return (inWords(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? " " + inWords(n % 1000) : ""));
            }

            if (n < 10000000) {
                return (inWords(Math.floor(n / 100000)) + " lakh" + (n % 100000 ? " " + inWords(n % 100000) : ""));
            }

            if (n < 1000000000) {
                return (inWords(Math.floor(n / 10000000)) + " crore" + (n % 10000000 ? " " + inWords(n % 10000000) : ""));
            }

            return n.toString();
        }

        const words = inWords(num);
        const plural = num === 1 ? "" : "";

        return ('<span class="amount-words-tag">In words</span>' + `<span>${
            words
        }

        ${
            currencyName.toLowerCase()
        }

        ${
            plural
        }

        </span>`);
    }

    function sipMaturity(monthly, years, annualRate, stepUpPct) {
        const n = Math.max(0, Math.round(years * 12));

        if (n === 0 || monthly <= 0 || !isFinite(monthly) || !isFinite(years) || !isFinite(annualRate)) {
            return {
                fvPlain: 0, fvStep: 0, totalInvestPlain: 0, totalInvestStep: 0
            }

                ;
        }

        const r = Math.max(0, annualRate) / 12 / 100;
        let fvPlain;

        if (r === 0) {
            fvPlain = monthly * n;
        }

        else {
            fvPlain = monthly * ((Math.pow(1 + r, n) - 1) / r);
        }

        let fvStep = 0;
        let totalInvestStep = 0;
        const stepUpFactor = isFinite(stepUpPct) ? 1 + Math.max(0, stepUpPct) / 100 : 1;
        let currentMonthly = monthly;

        for (let year = 0; year < years && isFinite(currentMonthly); year++) {
            const monthsLeft = 12 * (years - year);

            if (r === 0) {
                fvStep += currentMonthly * monthsLeft;
            }

            else {
                const yearFV = currentMonthly * ((Math.pow(1 + r, monthsLeft) - 1) / r);

                if (isFinite(yearFV)) {
                    fvStep += yearFV;
                }
            }

            totalInvestStep += currentMonthly * 12;
            currentMonthly *= stepUpFactor;
            if (!isFinite(fvStep) || !isFinite(totalInvestStep)) break;
        }

        const totalInvestPlain = monthly * n;

        return {
            fvPlain, fvStep, totalInvestPlain, totalInvestStep
        }

            ;
    }

    function sipForTarget(target, years, annualRate) {
        const n = Math.max(0, Math.round(years * 12));

        if (n === 0 || target <= 0 || !isFinite(target) || !isFinite(years) || !isFinite(annualRate)) {
            return 0;
        }

        const r = Math.max(0, annualRate) / 12 / 100;
        if (r === 0) return Math.max(0, target / n);
        const factor = (Math.pow(1 + r, n) - 1) / r;
        if (factor === 0 || !isFinite(factor)) return 0;
        const result = target / factor;
        return isFinite(result) ? Math.max(0, result) : 0;
    }

    function durationForTarget(sip, target, annualRate) {
        if (sip <= 0 || target <= 0 || !isFinite(sip) || !isFinite(target) || !isFinite(annualRate)) {
            return 0;
        }

        const r = Math.max(0, annualRate) / 12 / 100;

        if (r === 0) {
            const result = target / sip / 12;
            return isFinite(result) ? Math.max(0, result) : 0;
        }

        const x = 1 + (target * r) / sip;
        if (x <= 0 || !isFinite(x)) return 0;
        const n = Math.log(x) / Math.log(1 + r);
        const result = n / 12;
        return isFinite(result) ? Math.max(0, result) : 0;
    }

    function roiForTarget(sip, target, years) {
        if (sip <= 0 || target <= 0 || years <= 0 || !isFinite(sip) || !isFinite(target) || !isFinite(years)) {
            return 0;
        }

        const n = Math.round(years * 12);
        if (n <= 0) return 0;
        let low = 0;
        let high = 0.5;

        for (let i = 0; i < 40; i++) {
            const mid = (low + high) / 2;
            const m = mid / 12;
            let fv;

            if (m === 0) {
                fv = sip * n;
            }

            else {
                fv = sip * ((Math.pow(1 + m, n) - 1) / m);
            }

            if (!isFinite(fv)) break;
            if (fv < target) low = mid; else high = mid;
        }

        const result = ((low + high) / 2) * 100;
        return isFinite(result) ? Math.max(0, result) : 0;
    }

    function loanEMI(principal, annualRate, years) {
        const n = years * 12;

        if (principal <= 0 || n <= 0 || !isFinite(principal) || !isFinite(annualRate) || !isFinite(years)) {
            return {
                emi: 0, totalInterest: 0
            }

                ;
        }

        const r = Math.max(0, annualRate) / 12 / 100;

        if (r === 0) {
            const emi = principal / n;

            return {
                emi, totalInterest: 0
            }

                ;
        }

        const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const totalPaid = emi * n;

        return {
            emi, totalInterest: totalPaid - principal
        }

            ;
    }

    function swpMaxSafe(corpus, annualReturn, freq) {
        const r = annualReturn / 100;
        const payout = corpus * (r / freq);
        return payout;
    }

    function swpExhaustWithdrawal(corpus, annualReturn, years, freq) {
        const n = years * freq;
        if (corpus <= 0 || n <= 0) return 0;
        const r = annualReturn / freq / 100;
        if (r === 0) return corpus / n;
        const denom = (Math.pow(1 + r, n) - 1) / r;
        if (denom === 0) return 0;
        return corpus / denom;
    }

    function swpCorpusLife(corpus, withdrawal, annualReturn, freq) {
        if (corpus <= 0 || withdrawal <= 0 || !isFinite(corpus) || !isFinite(withdrawal) || !isFinite(annualReturn)) {
            return 0;
        }

        const r = Math.max(0, annualReturn) / freq / 100;

        if (r === 0) {
            const n = corpus / withdrawal;
            return isFinite(n) ? Math.max(0, n / freq) : 0;
        }

        let n = 0;
        let currentCorpus = corpus;
        const maxIterations = 100 * freq;

        while (currentCorpus > 0.01 && n < maxIterations) {
            currentCorpus = currentCorpus * (1 + r) - withdrawal;
            n++;
            if (!isFinite(currentCorpus)) break;
        }

        return isFinite(n) ? Math.max(0, n / freq) : 0;
    }

    function swpEndCorpus(corpus, withdrawal, years, annualReturn, freq) {
        const n = years * freq;
        const r = annualReturn / freq / 100;
        let bal = corpus;

        for (let i = 0; i < n; i++) {
            bal = bal * (1 + r) - withdrawal;

            if (bal < 0) {
                bal = 0;
                break;
            }
        }

        return bal;
    }

    const currencySelect = document.getElementById("currencySelect");
    const primaryModeSelect = document.getElementById("primaryModeSelect");
    const modeTabs = document.getElementById("modeTabs");
    const settingsToggle = document.getElementById("settingsToggle");
    const settingsPanel = document.getElementById("settingsPanel");

    const panels = {
        left: {
            standard: document.getElementById("leftPanel-standard"),
            "sip-basic": document.getElementById("leftPanel-sip-basic"),
            "sip-target": document.getElementById("leftPanel-sip-target"),
            "sip-duration": document.getElementById("leftPanel-sip-duration"),
            "sip-roi": document.getElementById("leftPanel-sip-roi"),
            swp: document.getElementById("leftPanel-swp"),
            amortization: document.getElementById("leftPanel-amortization"),
            expenses: document.getElementById("leftPanel-expenses"),
        }

        ,
        right: {
            standard: document.getElementById("rightPanel-standard"),
            "sip-basic": document.getElementById("rightPanel-sip-basic"),
            "sip-target": document.getElementById("rightPanel-sip-target"),
            "sip-duration": document.getElementById("rightPanel-sip-duration"),
            "sip-roi": document.getElementById("rightPanel-sip-roi"),
            swp: document.getElementById("rightPanel-swp"),
            amortization: document.getElementById("rightPanel-amortization"),
            expenses: document.getElementById("rightPanel-expenses"),
        }

        ,
    }

        ;

    // Expense tracking storage
    let expenses = [];

    try {
        const stored = window.localStorage.getItem("financeCalcExpenses");

        if (stored) {
            expenses = JSON.parse(stored);
        }
    }

    catch (e) {
        expenses = [];
    }

    function saveExpenses() {
        try {
            window.localStorage.setItem("financeCalcExpenses", JSON.stringify(expenses));
        }

        catch (e) {
            console.error("Failed to save expenses:", e);
        }
    }

    function addExpense() {
        const amount = parseNumber(document.getElementById("expenseAmount").dataset.raw || document.getElementById("expenseAmount").value);
        const category = document.getElementById("expenseCategory").value || "Other";
        const date = document.getElementById("expenseDate").value || new Date().toISOString().split("T")[0];
        const description = document.getElementById("expenseDescription").value || "";

        if (amount <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        const expense = {
            id: Date.now(),
            amount,
            category,
            date,
            description,
            timestamp: new Date().toISOString(),
        }

            ;

        expenses.unshift(expense);
        saveExpenses();
        recalcExpenses();

        // Clear form
        document.getElementById("expenseAmount").value = "";
        document.getElementById("expenseAmount").dataset.raw = "";
        document.getElementById("expenseDescription").value = "";
        document.getElementById("expenseDate").value = new Date().toISOString().split("T")[0];
    }

    function deleteExpense(id) {
        expenses = expenses.filter((e) => e.id !== id);
        saveExpenses();
        recalcExpenses();
    }

    function recalcExpenses() {
        if (expenses.length === 0) {
            document.getElementById("expenseTotalDisplay").textContent = formatNumber(0, currentCurrency);
            document.getElementById("expenseMonthDisplay").textContent = formatNumber(0, currentCurrency);
            document.getElementById("expenseDailyAvgDisplay").textContent = formatNumber(0, currentCurrency);
            document.getElementById("expenseCountDisplay").textContent = "0";
            document.getElementById("expenseCategoryBreakdown").innerHTML = '<div class="empty-state">No expenses added yet</div>';
            document.getElementById("expenseList").innerHTML = '<div class="empty-state">No expenses added yet</div>';
            return;
        }

        const total = expenses.reduce((sum, e) => sum + e.amount, 0);
        const now = new Date();
        const currentMonth = expenses.filter((e) => new Date(e.date).getMonth() === now.getMonth() && new Date(e.date).getFullYear() === now.getFullYear());
        const monthTotal = currentMonth.reduce((sum, e) => sum + e.amount, 0);

        const dates = expenses.map((e) => new Date(e.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        const daysDiff = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1);
        const dailyAvg = total / daysDiff;

        document.getElementById("expenseTotalDisplay").textContent = formatNumber(total, currentCurrency);
        document.getElementById("expenseMonthDisplay").textContent = formatNumber(monthTotal, currentCurrency);
        document.getElementById("expenseDailyAvgDisplay").textContent = formatNumber(dailyAvg, currentCurrency);
        document.getElementById("expenseCountDisplay").textContent = expenses.length.toString();

        // Category breakdown
        const categoryTotals = {}

            ;

        expenses.forEach((e) => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        });

        const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 8);

        const maxCategory = Math.max(...sortedCategories.map((c) => c[1]), 1);

        let breakdownHTML = "";

        sortedCategories.forEach(([category, amount]) => {
            const percentage = (amount / total) * 100;
            const width = (amount / maxCategory) * 100;

            breakdownHTML += ` <div class="category-bar" > <div class="category-bar-label" >${
                category
            }

            </div> <div class="category-bar-fill" > <div class="category-bar-value" style="width: ${width}%" ></div> </div> <div class="category-bar-amount" >${
                formatNumber(amount, currentCurrency, false)
            }

            (${
                    percentage.toFixed(1)
                }

                %)</div> </div> `;
        });

        document.getElementById("expenseCategoryBreakdown").innerHTML = breakdownHTML || '<div class="empty-state">No expenses added yet</div>';

        // Expense list (show last 20)
        const recentExpenses = expenses.slice(0, 20);
        let listHTML = "";

        recentExpenses.forEach((expense) => {
            const dateObj = new Date(expense.date);

            const dateStr = dateObj.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: dateObj.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
            });

            listHTML += ` <div class="expense-item" > <div class="expense-item-left" > <div class="expense-item-category" >${
            expense.category
        }

        </div> <div class="expense-item-date" >${
            dateStr
        }

        ${
            expense.description ? " • " + expense.description : ""
        }

        </div> </div> <div class="expense-item-amount" >${
            formatNumber(expense.amount, currentCurrency, false)
        }

        </div> <div class="expense-item-actions" > <button onclick="deleteExpense(${expense.id})" >Delete</button> </div> </div> `;
        });

        document.getElementById("expenseList").innerHTML = listHTML || '<div class="empty-state">No expenses added yet</div>';
    }

    // Make deleteExpense available globally for onclick handlers
    window.deleteExpense = deleteExpense;

    function setMode(mode) {
        Object.keys(panels.left).forEach((key) => {
            if (panels.left[key]) {
                panels.left[key].classList.toggle("hidden", key !== mode);
            }
        });

        Object.keys(panels.right).forEach((key) => {
            if (panels.right[key]) {
                panels.right[key].classList.toggle("hidden", key !== mode);
            }
        });

        document.querySelectorAll(".mode-tab").forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.mode === mode);
        });
        primaryModeSelect.value = mode;
        debouncedRecalc();
    }

    modeTabs.addEventListener("click", (e) => {
        const btn = e.target.closest(".mode-tab");
        if (!btn) return;
        const mode = btn.dataset.mode;
        if (mode) setMode(mode);
    });

    primaryModeSelect.addEventListener("change", (e) => {
        setMode(e.target.value);
    });

    currencySelect.addEventListener("change", () => {
        currentCurrency = currencySelect.value || "INR";

        document.querySelectorAll(".currency-prefix").forEach((el) => {
            el.textContent = currencyConfig[currentCurrency].symbol;
        });
        debouncedRecalc();
    });

    if (settingsToggle && settingsPanel) {
        settingsToggle.addEventListener("click", () => {
            settingsPanel.classList.toggle("hidden");
        });
    }

    const themeToggle = document.getElementById("themeToggle");

    if (themeToggle) {
        themeToggle.addEventListener("click", (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;
            const theme = btn.dataset.theme || "dark";
            applyTheme(theme);
        });
    }

    const viewModeToggle = document.getElementById("viewModeToggle");

    if (viewModeToggle) {
        viewModeToggle.addEventListener("click", (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;
            const mode = btn.dataset.view || "advanced";
            applyViewMode(mode);
        });
    }

    document.querySelectorAll(".field-group").forEach((fg) => {
        const input = fg.querySelector("input, select, textarea");
        if (!input) return;
        input.addEventListener("focus", () => fg.classList.add("focused"));

        input.addEventListener("blur", () => {
            fg.classList.remove("focused");
            // Validate on blur
            const value = parseNumber(input.dataset.raw || input.value);
            const allowsDecimals = input.getAttribute("inputmode") === "decimal";
            const max = allowsDecimals ? 100 : Infinity;
            const validation = validateInput(value, 0, max, "");

            if (!validation.valid && value > 0) {
                fg.classList.add("invalid");
            }

            else {
                fg.classList.remove("invalid");
            }
        });

        // Add keyboard navigation
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                input.blur();
            }
        });
    });

    const amountWordsMap = {
        housePrice: "housePriceWords",
        middleDown: "middleDownWords",
        investorDown: "investorDownWords",
        sipAmount: "sipAmountWords",
        targetCorpus: "targetCorpusWords",
        durSipAmount: "durSipAmountWords",
        durTargetCorpus: "durTargetCorpusWords",
        roiSipAmount: "roiSipAmountWords",
        roiTargetCorpus: "roiTargetCorpusWords",
        swpCorpus: "swpCorpusWords",
        swpWithdrawal: "swpWithdrawalWords",
        swpReqWithdrawal: "swpReqWithdrawalWords",
        amortPrincipal: "amortPrincipalWords",
    }

        ;

    // Debounced recalculation function with error handling
    const debouncedRecalc = debounce(() => {
        try {
            recalcAll();
        }

        catch (error) {
            console.error("Calculation error:", error);
            // Gracefully handle errors - don't break the UI
        }
    }

        , 300);

    Object.entries(amountWordsMap).forEach(([inputId, wordsId]) => {
        const input = document.getElementById(inputId);
        const wordsDiv = document.getElementById(wordsId);
        if (!input || !wordsDiv) return;

        input.addEventListener("input", () => {
            formatInputWithCommas(input);
            const raw = parseNumber(input.dataset.raw || input.value);

            if (raw > 0) {
                wordsDiv.innerHTML = numberToWords(raw, currentCurrency);
            }

            else {
                wordsDiv.innerHTML = "";
            }

            debouncedRecalc();
        });
    });

    // Expense amount input formatting
    const expenseAmountInput = document.getElementById("expenseAmount");

    if (expenseAmountInput) {
        expenseAmountInput.addEventListener("input", () => {
            formatInputWithCommas(expenseAmountInput);
        });

        expenseAmountInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                addExpense();
            }
        });
    }

    document.querySelectorAll("#years,#middleRate,#investorRate,#houseGrowth,#equityReturn,#sipYears,#sipReturn,#sipStepUp,#targetYears,#targetReturn,#targetStepUp,#durReturn,#durStepUp,#roiYears,#roiStepUp,#swpDuration,#swpReturn,#swpReqDuration,#swpReqReturn,#amortRate,#amortYears"

    ).forEach((input) => {
        input.addEventListener("input", () => {
            formatInputWithCommas(input);
            debouncedRecalc();
        });
    });

    document.querySelectorAll("#enableStepUpStandard,#stepUpPercentStandard,#enableStepUpBasic,#enableStepUpTarget,#enableStepUpDur,#enableStepUpRoi"

    ).forEach((el) => {
        el.addEventListener(el.tagName === "INPUT" && el.type === "checkbox" ? "change" : "input",
            debouncedRecalc);
    });

    const swpFrequency = document.getElementById("swpFrequency");
    swpFrequency.addEventListener("change", debouncedRecalc);

    const amortFreqToggle = document.getElementById("amortFreqToggle");

    if (amortFreqToggle) {
        amortFreqToggle.addEventListener("click", (e) => {
            const btn = e.target.closest("button");
            if (!btn) return;
            amortFreqToggle.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
            debouncedRecalc();
        });
    }

    const addExpenseBtn = document.getElementById("addExpenseBtn");

    if (addExpenseBtn) {
        addExpenseBtn.addEventListener("click", () => {
            addExpense();
        });
    }

    // Set default date to today
    const expenseDateInput = document.getElementById("expenseDate");

    if (expenseDateInput && !expenseDateInput.value) {
        expenseDateInput.value = new Date().toISOString().split("T")[0];
    }

    const swpModeToggle = document.getElementById("swpModeToggle");
    const swpFromCorpusInputs = document.getElementById("swpFromCorpusInputs");
    const swpRequiredCorpusInputs = document.getElementById("swpRequiredCorpusInputs"
    );

    swpModeToggle.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const mode = btn.dataset.swpMode;
        swpModeToggle.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));

        if (mode === "fromCorpus") {
            swpFromCorpusInputs.classList.remove("hidden");
            swpRequiredCorpusInputs.classList.add("hidden");
        }

        else {
            swpFromCorpusInputs.classList.add("hidden");
            swpRequiredCorpusInputs.classList.remove("hidden");
        }

        debouncedRecalc();
    });

    function recalcStandard() {
        const housePrice = Math.max(0, parseNumber(document.getElementById("housePrice").dataset.raw || document.getElementById("housePrice").value));
        const years = Math.max(0, Math.min(100, parseNumber(document.getElementById("years").dataset.raw || document.getElementById("years").value)));
        const middleDown = parseNumber(document.getElementById("middleDown").dataset.raw || document.getElementById("middleDown").value);
        const investorDown = parseNumber(document.getElementById("investorDown").dataset.raw || document.getElementById("investorDown").value);
        const middleRate = parseNumber(document.getElementById("middleRate").dataset.raw || document.getElementById("middleRate").value);
        const investorRate = parseNumber(document.getElementById("investorRate").dataset.raw || document.getElementById("investorRate").value);
        const houseGrowth = parseNumber(document.getElementById("houseGrowth").dataset.raw || document.getElementById("houseGrowth").value);
        const equityReturn = parseNumber(document.getElementById("equityReturn").dataset.raw || document.getElementById("equityReturn").value);
        const enableStepUpStandard = document.getElementById("enableStepUpStandard").checked;
        const stepUpPercentStandard = parseNumber(document.getElementById("stepUpPercentStandard").dataset.raw || document.getElementById("stepUpPercentStandard").value);

        const middleLoan = Math.max(0, housePrice - middleDown);
        const investorLoan = Math.max(0, housePrice - investorDown);

        const middleLoanRes = loanEMI(middleLoan, middleRate, years);
        const investorLoanRes = loanEMI(investorLoan, investorRate, years);

        const middleEmi = middleLoanRes.emi;
        const middleInterest = middleLoanRes.totalInterest;
        const investorEmi = investorLoanRes.emi;
        const investorInterest = investorLoanRes.totalInterest;

        const houseFutureValue = housePrice > 0 && years > 0 && isFinite(houseGrowth) ? housePrice * Math.pow(1 + Math.max(0, houseGrowth) / 100, years) : 0;
        const middleHouseGain = houseFutureValue - housePrice - middleInterest;
        const investorHouseGain = houseFutureValue - housePrice - investorInterest;

        const middleRoi = middleDown > 0 ? (middleHouseGain / middleDown) * 100 : 0;
        const investorRoi = investorDown > 0 ? (investorHouseGain / investorDown) * 100 : 0;

        const extraCapitalInvestor = Math.max(0, middleDown - investorDown);
        const investorEquityFuture = extraCapitalInvestor * Math.pow(1 + equityReturn / 100, years);

        const emiDiff = Math.max(0, investorEmi - middleEmi);
        let emiSipFuture = 0;

        if (emiDiff > 0) {
            if (enableStepUpStandard) {
                const stepRes = sipMaturity(emiDiff,
                    years,
                    equityReturn,
                    stepUpPercentStandard);
                emiSipFuture = stepRes.fvStep;
            }

            else {
                const plainRes = sipMaturity(emiDiff, years, equityReturn, 0);
                emiSipFuture = plainRes.fvPlain;
            }
        }

        const middleTotalWealth = houseFutureValue + emiSipFuture;
        const investorTotalWealth = houseFutureValue + investorEquityFuture;

        document.getElementById("middleEmiDisplay").textContent = formatNumber(middleEmi,
            currentCurrency);
        document.getElementById("middleInterestDisplay").textContent = formatNumber(middleInterest, currentCurrency);
        document.getElementById("investorEmiDisplay").textContent = formatNumber(investorEmi, currentCurrency);
        document.getElementById("investorInterestDisplay").textContent = formatNumber(investorInterest, currentCurrency);
        document.getElementById("houseFutureValueDisplay").textContent = formatNumber(houseFutureValue, currentCurrency);
        document.getElementById("houseCagrDisplay").textContent = houseGrowth.toFixed(1) + "%";
        document.getElementById("middleHouseGainDisplay").textContent = formatNumber(middleHouseGain, currentCurrency);
        document.getElementById("investorHouseGainDisplay").textContent = formatNumber(investorHouseGain, currentCurrency);
        document.getElementById("middleRoiDisplay").textContent = middleRoi.toFixed(1) + "%";
        document.getElementById("investorRoiDisplay").textContent = investorRoi.toFixed(1) + "%";
        document.getElementById("investorEquityFutureDisplay").textContent = formatNumber(investorEquityFuture, currentCurrency);
        document.getElementById("emiSipFutureDisplay").textContent = formatNumber(emiSipFuture, currentCurrency);
        document.getElementById("middleTotalWealthDisplay").textContent = formatNumber(middleTotalWealth, currentCurrency);
        document.getElementById("investorTotalWealthDisplay").textContent = formatNumber(investorTotalWealth, currentCurrency);
    }

    function recalcSipBasic() {
        const sipAmount = parseNumber(document.getElementById("sipAmount").dataset.raw || document.getElementById("sipAmount").value);
        const years = parseNumber(document.getElementById("sipYears").dataset.raw || document.getElementById("sipYears").value);
        const annualReturn = parseNumber(document.getElementById("sipReturn").dataset.raw || document.getElementById("sipReturn").value);
        const stepUp = parseNumber(document.getElementById("sipStepUp").dataset.raw || document.getElementById("sipStepUp").value);
        const enableStepUpBasic = document.getElementById("enableStepUpBasic").checked;

        const resPlain = sipMaturity(sipAmount, years, annualReturn, 0);
        const resStep = sipMaturity(sipAmount,
            years,
            annualReturn,
            enableStepUpBasic ? stepUp : 0);

        const months = Math.max(0, Math.round(years * 12));

        const totalInvestedPlain = resPlain.totalInvestPlain;
        const totalInvestedStep = resStep.totalInvestStep;
        const fvPlain = resPlain.fvPlain;
        const fvStep = resStep.fvStep;

        const maturity = enableStepUpBasic ? fvStep : fvPlain;
        const totalInvested = enableStepUpBasic ? totalInvestedStep : totalInvestedPlain;
        const gain = maturity - totalInvested;
        const cagr = annualReturn;

        const avgMonthly = totalInvested / Math.max(1, months);
        const wealthMultiple = totalInvested > 0 ? maturity / totalInvested : 0;

        const delayYears = 5;
        const delayRes = sipMaturity(sipAmount, years - delayYears, annualReturn, 0);
        const delayLoss = fvPlain - delayRes.fvPlain;

        document.getElementById("sipTotalInvestedDisplay").textContent = formatNumber(totalInvested, currentCurrency);
        document.getElementById("sipMonthsDisplay").textContent = months.toString();
        document.getElementById("sipMaturityDisplay").textContent = formatNumber(maturity, currentCurrency);
        document.getElementById("sipGainDisplay").textContent = formatNumber(gain, currentCurrency);
        document.getElementById("sipCagrDisplay").textContent = cagr.toFixed(1) + "%";

        document.getElementById("sipPlainMaturityDisplay").textContent = formatNumber(fvPlain, currentCurrency);
        document.getElementById("sipStepMaturityDisplay").textContent = formatNumber(fvStep, currentCurrency);
        document.getElementById("sipExtraStepDisplay").textContent = formatNumber(fvStep - fvPlain,
            currentCurrency);
        document.getElementById("sipAvgMonthlyDisplay").textContent = formatNumber(avgMonthly, currentCurrency);
        document.getElementById("sipWealthMultipleDisplay").textContent = wealthMultiple.toFixed(1) + "x";
        document.getElementById("sipDelayCostDisplay").textContent = formatNumber(delayLoss, currentCurrency);

        // Calculate and display SIP breakdown - Without Step-up
        const breakdownPlain = calculateSipBreakdown(sipAmount, years, annualReturn, 0, false);
        const breakdownBodyPlain = document.getElementById("sipBreakdownBodyPlain");

        if (breakdownBodyPlain) {
            breakdownBodyPlain.innerHTML = "";

            breakdownPlain.forEach((entry) => {
                const row = document.createElement("tr");

                row.innerHTML = ` <td>${
                    entry.year
                }

                </td> <td>${
                    entry.month
                }

                </td> <td>${
                    formatNumber(entry.investment, currentCurrency, false)
                }

                </td> <td>${
                    formatNumber(entry.value, currentCurrency, false)
                }

                </td> `;
                breakdownBodyPlain.appendChild(row);
            });
        }

        // Calculate and display SIP breakdown - With Step-up
        const breakdownStep = calculateSipBreakdown(sipAmount, years, annualReturn, stepUp, true);
        const breakdownBodyStep = document.getElementById("sipBreakdownBodyStep");

        if (breakdownBodyStep) {
            breakdownBodyStep.innerHTML = "";

            breakdownStep.forEach((entry) => {
                const row = document.createElement("tr");

                row.innerHTML = ` <td>${
                    entry.year
                }

                </td> <td>${
                    entry.month
                }

                </td> <td>${
                    formatNumber(entry.investment, currentCurrency, false)
                }

                </td> <td>${
                    formatNumber(entry.value, currentCurrency, false)
                }

                </td> `;
                breakdownBodyStep.appendChild(row);
            });
        }
    }

    function recalcSipTarget() {
        const targetCorpus = parseNumber(document.getElementById("targetCorpus").dataset.raw || document.getElementById("targetCorpus").value);
        const years = parseNumber(document.getElementById("targetYears").dataset.raw || document.getElementById("targetYears").value);
        const annualReturn = parseNumber(document.getElementById("targetReturn").dataset.raw || document.getElementById("targetReturn").value);
        const stepUp = parseNumber(document.getElementById("targetStepUp").dataset.raw || document.getElementById("targetStepUp").value);
        const enableStepUpTarget = document.getElementById("enableStepUpTarget").checked;

        let requiredSip = 0;
        let totalInvest = 0;
        const months = Math.max(0, Math.round(years * 12));

        if (!enableStepUpTarget) {
            requiredSip = sipForTarget(targetCorpus, years, annualReturn);
            totalInvest = requiredSip * months;
        }

        else {
            let guess = targetCorpus / (months * 0.6 || 1);
            let low = 0;
            let high = guess * 5;

            for (let i = 0; i < 40; i++) {
                const mid = (low + high) / 2;
                const res = sipMaturity(mid, years, annualReturn, stepUp);
                const fv = res.fvStep;
                if (fv < targetCorpus) low = mid;
                else high = mid;
            }

            requiredSip = (low + high) / 2;
            const resFinal = sipMaturity(requiredSip, years, annualReturn, stepUp);
            totalInvest = resFinal.totalInvestStep;
        }

        const wealthMultiple = totalInvest > 0 ? targetCorpus / totalInvest : 0;

        document.getElementById("reqSipDisplay").textContent = formatNumber(requiredSip, currentCurrency);
        document.getElementById("reqTotalInvestDisplay").textContent = formatNumber(totalInvest, currentCurrency);
        document.getElementById("reqMonthsDisplay").textContent = months.toString();
        document.getElementById("reqWealthMultipleDisplay").textContent = wealthMultiple.toFixed(1) + "x";

        document.getElementById("reqSipIncomePctDisplay").textContent = "–";
        document.getElementById("reqRealisticFlag").textContent = wealthMultiple > 2.5 ? "Market‑dependent" : "More savings‑driven";

        document.getElementById("reqFutureIfReducedDisplay").textContent = formatNumber(targetCorpus * 0.8, currentCurrency);
        const sipIfExtra5 = sipForTarget(targetCorpus, years + 5, annualReturn);
        document.getElementById("reqSipIfExtra5YrDisplay").textContent = formatNumber(sipIfExtra5, currentCurrency);
        const sipIfLowerReturn = sipForTarget(targetCorpus, years, Math.max(0, annualReturn - 2));
        document.getElementById("reqSipIfLowerReturnDisplay").textContent = formatNumber(sipIfLowerReturn, currentCurrency);
    }

    function recalcSipDuration() {
        const sipAmount = parseNumber(document.getElementById("durSipAmount").dataset.raw || document.getElementById("durSipAmount").value);
        const targetCorpus = parseNumber(document.getElementById("durTargetCorpus").dataset.raw || document.getElementById("durTargetCorpus").value);
        const annualReturn = parseNumber(document.getElementById("durReturn").dataset.raw || document.getElementById("durReturn").value);
        const stepUp = parseNumber(document.getElementById("durStepUp").dataset.raw || document.getElementById("durStepUp").value);
        const enableStepUpDur = document.getElementById("enableStepUpDur").checked;

        let years = 0;

        if (!enableStepUpDur) {
            years = durationForTarget(sipAmount, targetCorpus, annualReturn);
        }

        else {
            let low = 0;
            let high = 60;

            for (let i = 0; i < 40; i++) {
                const mid = (low + high) / 2;
                const res = sipMaturity(sipAmount,
                    mid,
                    annualReturn,
                    stepUp);
                const fv = res.fvStep;
                if (fv < targetCorpus) low = mid;
                else high = mid;
            }

            years = (low + high) / 2;
        }

        const months = Math.round(years * 12);
        const totalInvest = sipAmount * months;
        const wealthMultiple = totalInvest > 0 ? targetCorpus / totalInvest : 0;

        document.getElementById("durYearsDisplay").textContent = years.toFixed(1) + " yrs";
        document.getElementById("durMonthsDisplay").textContent = months.toString();
        document.getElementById("durTotalInvestedDisplay").textContent = formatNumber(totalInvest, currentCurrency);
        document.getElementById("durWealthMultipleDisplay").textContent = wealthMultiple.toFixed(1) + "x";

        document.getElementById("durYearsIfHigherSipDisplay").textContent = Math.max(0, years * 0.85).toFixed(1) + " yrs";
        document.getElementById("durYearsIfHigherReturnDisplay").textContent = Math.max(0, years * 0.9).toFixed(1) + " yrs";
        document.getElementById("durYearsIfLowerReturnDisplay").textContent = (years * 1.1).toFixed(1) + " yrs";

        const delayRes = sipMaturity(sipAmount, years - 3, annualReturn, 0);
        const fullRes = sipMaturity(sipAmount, years, annualReturn, 0);
        const delayLoss = fullRes.fvPlain - delayRes.fvPlain;
        document.getElementById("durLossIfDelayDisplay").textContent = formatNumber(delayLoss, currentCurrency);
        document.getElementById("durAgeFlagDisplay").textContent = "Align with retirement / child education age";
    }

    function recalcSipRoi() {
        const sipAmount = parseNumber(document.getElementById("roiSipAmount").dataset.raw || document.getElementById("roiSipAmount").value);
        const targetCorpus = parseNumber(document.getElementById("roiTargetCorpus").dataset.raw || document.getElementById("roiTargetCorpus").value);
        const years = parseNumber(document.getElementById("roiYears").dataset.raw || document.getElementById("roiYears").value);
        const stepUp = parseNumber(document.getElementById("roiStepUp").dataset.raw || document.getElementById("roiStepUp").value);
        const enableStepUpRoi = document.getElementById("enableStepUpRoi").checked;

        let requiredRoi = 0;

        if (!enableStepUpRoi) {
            requiredRoi = roiForTarget(sipAmount, targetCorpus, years);
        }

        else {
            let low = 0;
            let high = 0.5;

            for (let i = 0; i < 40; i++) {
                const mid = (low + high) / 2;
                const res = sipMaturity(sipAmount,
                    years,
                    mid * 100,
                    stepUp);
                const fv = res.fvStep;
                if (fv < targetCorpus) low = mid;
                else high = mid;
            }

            requiredRoi = ((low + high) / 2) * 100;
        }

        document.getElementById("roiRequiredDisplay").textContent = requiredRoi.toFixed(1) + "%";
        let riskFlag = "Moderate";
        if (requiredRoi <= 10) riskFlag = "Comfortable";
        else if (requiredRoi <= 14) riskFlag = "Reasonable";
        else if (requiredRoi <= 18) riskFlag = "Stretch";
        else riskFlag = "Aggressive";
        document.getElementById("roiRiskFlagDisplay").textContent = riskFlag;

        document.getElementById("roiIfHigherSipDisplay").textContent = Math.max(0, requiredRoi * 0.85).toFixed(1) + "%";
        document.getElementById("roiIfLongerTenorDisplay").textContent = Math.max(0, requiredRoi * 0.9).toFixed(1) + "%";
        document.getElementById("roiIfLowerGoalDisplay").textContent = Math.max(0, requiredRoi * 0.8).toFixed(1) + "%";
    }

    function recalcSwp() {
        const freq = parseInt(swpFrequency.value || "12", 10);

        const swpMode = !swpFromCorpusInputs.classList.contains("hidden") ? "fromCorpus"
            : "requiredCorpus";

        let corpus = parseNumber(document.getElementById("swpCorpus").dataset.raw || document.getElementById("swpCorpus").value);
        let durationYears = parseNumber(document.getElementById("swpDuration").dataset.raw || document.getElementById("swpDuration").value);
        let annualReturn = parseNumber(document.getElementById("swpReturn").dataset.raw || document.getElementById("swpReturn").value);
        let withdrawal = parseNumber(document.getElementById("swpWithdrawal").dataset.raw || document.getElementById("swpWithdrawal").value);

        if (swpMode === "requiredCorpus") {
            const reqWithdrawal = parseNumber(document.getElementById("swpReqWithdrawal").dataset.raw || document.getElementById("swpReqWithdrawal").value);
            const reqDurationYears = parseNumber(document.getElementById("swpReqDuration").dataset.raw || document.getElementById("swpReqDuration").value);
            const reqReturn = parseNumber(document.getElementById("swpReqReturn").dataset.raw || document.getElementById("swpReqReturn").value);

            if (reqWithdrawal > 0 && reqReturn > 0) {
                const safeCorpus = reqWithdrawal / (reqReturn / 100 / freq);
                const exhaustCorpus = reqDurationYears > 0 ? reqWithdrawal / ((reqReturn / 100 / freq) * (Math.pow(1 + reqReturn / 100 / freq,
                    reqDurationYears * freq) - 1)) : 0;

                corpus = safeCorpus;
                durationYears = reqDurationYears;
                annualReturn = reqReturn;
                withdrawal = reqWithdrawal;

                document.getElementById("swpReqCorpusDisplay").textContent = formatNumber(exhaustCorpus, currentCurrency);
            }
        }

        const maxSafeWithdrawal = swpMaxSafe(corpus,
            annualReturn,
            freq);
        const exhaustWithdrawal = swpExhaustWithdrawal(corpus,
            annualReturn,
            durationYears,
            freq);
        const corpusLifeYears = swpCorpusLife(corpus,
            withdrawal,
            annualReturn,
            freq);
        const endCorpus = swpEndCorpus(corpus,
            withdrawal,
            durationYears,
            annualReturn,
            freq);

        let sustainabilityFlag = "–";

        if (withdrawal <= 0 || corpus <= 0) {
            sustainabilityFlag = "Enter corpus & withdrawal";
        }

        else if (withdrawal <= maxSafeWithdrawal * 1.02) {
            sustainabilityFlag = "Safe (principal intact)";
        }

        else if (withdrawal <= exhaustWithdrawal * 1.02) {
            sustainabilityFlag = "Will deplete around plan end";
        }

        else if (corpusLifeYears >= durationYears) {
            sustainabilityFlag = "Slightly aggressive but lasts";
        }

        else {
            sustainabilityFlag = "Unsustainable (corpus ends in ~" + corpusLifeYears.toFixed(1) + " yrs)";
        }

        const fdMonthly = corpus * (annualReturn / 100 / 12);
        const fdQuarterly = corpus * (annualReturn / 100 / 4);
        const fdHalfYearly = corpus * (annualReturn / 100 / 2);
        const fdYearly = corpus * (annualReturn / 100);

        const totalWithdrawals = withdrawal * (durationYears * freq);

        document.getElementById("swpMaxSafeDisplay").textContent = formatNumber(maxSafeWithdrawal, currentCurrency);
        document.getElementById("swpExhaustWithdrawalDisplay"
        ).textContent = formatNumber(exhaustWithdrawal,
            currentCurrency);
        document.getElementById("swpCorpusLifeDisplay").textContent = corpusLifeYears.toFixed(1) + " yrs";
        document.getElementById("swpSustainabilityFlag").textContent = sustainabilityFlag;

        document.getElementById("fdMonthlyDisplay").textContent = formatNumber(fdMonthly, currentCurrency);
        document.getElementById("fdQuarterlyDisplay").textContent = formatNumber(fdQuarterly, currentCurrency);
        document.getElementById("fdHalfYearlyDisplay").textContent = formatNumber(fdHalfYearly, currentCurrency);
        document.getElementById("fdYearlyDisplay").textContent = formatNumber(fdYearly, currentCurrency);

        document.getElementById("swpTotalWithdrawalsDisplay").textContent = formatNumber(totalWithdrawals, currentCurrency);
        document.getElementById("swpEndCorpusDisplay").textContent = formatNumber(endCorpus, currentCurrency);

        if (swpMode === "fromCorpus") {
            document.getElementById("swpReqCorpusDisplay").textContent = formatNumber(withdrawal / (annualReturn / 100 / freq || 1),
                currentCurrency);
        }
    }

    function calculateAmortizationSchedule(principal, annualRate, years) {
        const schedule = [];
        const n = years * 12;

        if (principal <= 0 || n <= 0 || !isFinite(principal) || !isFinite(annualRate) || !isFinite(years)) {
            return schedule;
        }

        const r = Math.max(0, annualRate) / 12 / 100;
        let balance = principal;

        if (r === 0) {
            const emi = principal / n;

            for (let month = 1; month <= n; month++) {
                const principalPaid = emi;
                balance -= principalPaid;

                schedule.push({
                    month,
                    emi,
                    principal: principalPaid,
                    interest: 0,
                    balance: Math.max(0, balance)
                });
            }
        }

        else {
            const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

            for (let month = 1; month <= n; month++) {
                const interest = balance * r;
                const principalPaid = emi - interest;
                balance -= principalPaid;

                schedule.push({
                    month,
                    emi,
                    principal: principalPaid,
                    interest,
                    balance: Math.max(0, balance)
                });
            }
        }

        return schedule;
    }

    function calculateSipBreakdown(monthly, years, annualRate, stepUpPct, enableStepUp) {
        const breakdown = [];
        const n = Math.max(0, Math.round(years * 12));

        if (n === 0 || monthly <= 0 || !isFinite(monthly) || !isFinite(years) || !isFinite(annualRate)) {
            return breakdown;
        }

        const r = Math.max(0, annualRate) / 12 / 100;
        const stepUpFactor = enableStepUp && isFinite(stepUpPct) ? 1 + Math.max(0, stepUpPct) / 100 : 1;
        let currentMonthly = monthly;
        let totalValue = 0;
        let totalInvested = 0;

        for (let month = 1; month <= n; month++) {
            totalInvested += currentMonthly;

            if (r === 0) {
                totalValue += currentMonthly;
            }

            else {
                totalValue = totalValue * (1 + r) + currentMonthly;
            }

            // Add entry at year end or every 12 months
            if (month % 12 === 0 || month === n) {
                breakdown.push({
                    year: Math.ceil(month / 12),
                    month: month,
                    investment: totalInvested,
                    value: totalValue,
                    gain: totalValue - totalInvested
                });
            }

            // Step up at year end
            if (month % 12 === 0 && enableStepUp) {
                currentMonthly *= stepUpFactor;
            }
        }

        return breakdown;
    }

    function recalcAmortization() {
        const principal = parseNumber(document.getElementById("amortPrincipal").dataset.raw || document.getElementById("amortPrincipal").value);
        const annualRate = parseNumber(document.getElementById("amortRate").dataset.raw || document.getElementById("amortRate").value);
        const years = parseNumber(document.getElementById("amortYears").dataset.raw || document.getElementById("amortYears").value);

        const typeEl = document.getElementById("amortType");
        const amortType = typeEl ? typeEl.value || "reducing" : "reducing";
        const freqToggle = document.getElementById("amortFreqToggle");
        const freqBtnActive = freqToggle && freqToggle.querySelector("button.active");
        const scheduleMode = (freqBtnActive && freqBtnActive.dataset.amortFreq) || "monthly";

        let schedule = [];

        if (amortType === "flat") {
            // Flat / simple interest
            const n = years * 12;

            if (principal > 0 && annualRate >= 0 && n > 0) {
                const totalInterest = principal * (annualRate / 100) * years;
                const totalPayment = principal + totalInterest;
                const emi = totalPayment / n;
                let balance = principal;

                for (let month = 1; month <= n; month++) {
                    const interest = totalInterest / n;
                    const principalPaid = emi - interest;
                    balance -= principalPaid;

                    schedule.push({
                        month,
                        emi,
                        principal: principalPaid,
                        interest,
                        balance: Math.max(0, balance),
                    });
                }
            }
        }

        else if (amortType === "interest-only") {
            const n = years * 12;

            if (principal > 0 && annualRate >= 0 && n > 0) {
                const r = Math.max(0, annualRate) / 12 / 100;
                const interestEmi = principal * r;
                let balance = principal;

                for (let month = 1; month <= n; month++) {
                    let emi = interestEmi;
                    let principalPaid = 0;
                    const interest = interestEmi;

                    if (month === n) {
                        emi += principal;
                        principalPaid = principal;
                        balance = 0;
                    }

                    schedule.push({
                        month,
                        emi,
                        principal: principalPaid,
                        interest,
                        balance: Math.max(0, balance),
                    });
                }
            }
        }

        else {
            // Reducing (EMI)
            schedule = calculateAmortizationSchedule(principal, annualRate, years);
        }

        const tbody = document.getElementById("amortizationBody");
        if (!tbody) return;

        tbody.innerHTML = "";

        if (schedule.length === 0) {
            return;
        }

        const totalMonths = schedule.length;
        const totalPayment = schedule[0].emi * totalMonths;
        const totalInterest = totalPayment - principal;

        document.getElementById("amortEmiDisplay").textContent = formatNumber(schedule[0].emi, currentCurrency);
        document.getElementById("amortTotalInterestDisplay").textContent = formatNumber(totalInterest, currentCurrency);
        document.getElementById("amortTotalPaymentDisplay").textContent = formatNumber(totalPayment, currentCurrency);
        document.getElementById("amortTotalMonthsDisplay").textContent = totalMonths.toString();

        const periodHeader = document.getElementById("amortPeriodHeader");

        if (periodHeader) {
            periodHeader.textContent = scheduleMode === "yearly" ? "Year" : "Month";
        }

        if (scheduleMode === "yearly") {
            // Aggregate schedule by year
            const yearly = [];

            schedule.forEach((entry) => {
                const year = Math.ceil(entry.month / 12);

                if (!yearly[year]) {
                    yearly[year] = {
                        period: year,
                        emi: 0,
                        principal: 0,
                        interest: 0,
                        balance: entry.balance,
                    }

                        ;
                }

                yearly[year].emi += entry.emi;
                yearly[year].principal += entry.principal;
                yearly[year].interest += entry.interest;
                yearly[year].balance = entry.balance;
            });

            yearly.forEach((y) => {
                if (!y) return;
                const row = document.createElement("tr");

                row.innerHTML = ` <td>${
                y.period
            }

            </td> <td>${
                formatNumber(y.emi, currentCurrency, false)
            }

            </td> <td>${
                formatNumber(y.principal, currentCurrency, false)
            }

            </td> <td>${
                formatNumber(y.interest, currentCurrency, false)
            }

            </td> <td>${
                formatNumber(y.balance, currentCurrency, false)
            }

            </td> `;
                tbody.appendChild(row);
            });
        }

        else {
            // Monthly view: show first 12, then every 12th, then last 12 months
            const displayMonths = new Set();

            if (totalMonths <= 24) {
                // Show all months if 24 or fewer
                for (let i = 1; i <= totalMonths; i++) displayMonths.add(i);
            }

            else {
                // Show first 12 months
                for (let i = 1; i <= 12; i++) displayMonths.add(i);
                // Show every 12th month in the middle
                for (let i = 24; i <= totalMonths - 12; i += 12) displayMonths.add(i);
                // Show last 12 months
                for (let i = Math.max(13, totalMonths - 11); i <= totalMonths; i++) displayMonths.add(i);
            }

            schedule.forEach((entry) => {
                if (displayMonths.has(entry.month)) {
                    const row = document.createElement("tr");

                    row.innerHTML = ` <td>${
                    entry.month
                }

                </td> <td>${
                    formatNumber(entry.emi, currentCurrency, false)
                }

                </td> <td>${
                    formatNumber(entry.principal, currentCurrency, false)
                }

                </td> <td>${
                    formatNumber(entry.interest, currentCurrency, false)
                }

                </td> <td>${
                    formatNumber(entry.balance, currentCurrency, false)
                }

                </td> `;
                    tbody.appendChild(row);
                }
            });
        }
    }

    function recalcAll() {
        const currentMode = primaryModeSelect.value || "sip-basic";

        if (currentMode === "standard") {
            recalcStandard();
        }

        else if (currentMode === "sip-basic") {
            recalcSipBasic();
        }

        else if (currentMode === "sip-target") {
            recalcSipTarget();
        }

        else if (currentMode === "sip-duration") {
            recalcSipDuration();
        }

        else if (currentMode === "sip-roi") {
            recalcSipRoi();
        }

        else if (currentMode === "swp") {
            recalcSwp();
        }

        else if (currentMode === "amortization") {
            recalcAmortization();
        }

        else if (currentMode === "expenses") {
            recalcExpenses();
        }
    }

    function initDefaults() {
        const defaults = {
            housePrice: "5000000",
            years: "20",
            middleDown: "4000000",
            investorDown: "500000",
            middleRate: "8.5",
            investorRate: "6.5",
            houseGrowth: "8",
            equityReturn: "12",
            sipAmount: "25000",
            sipYears: "20",
            sipReturn: "12",
            sipStepUp: "10",
            targetCorpus: "10000000",
            targetYears: "20",
            targetReturn: "12",
            targetStepUp: "10",
            durSipAmount: "25000",
            durTargetCorpus: "10000000",
            durReturn: "12",
            durStepUp: "10",
            roiSipAmount: "25000",
            roiTargetCorpus: "10000000",
            roiYears: "20",
            roiStepUp: "10",
            swpCorpus: "5000000",
            swpDuration: "20",
            swpReturn: "7",
            swpWithdrawal: "40000",
            swpReqWithdrawal: "40000",
            swpReqDuration: "20",
            swpReqReturn: "7",
            stepUpPercentStandard: "10",
            amortPrincipal: "5000000",
            amortRate: "8.5",
            amortYears: "20",
        }

            ;

        Object.entries(defaults).forEach(([id, val]) => {
            const el = document.getElementById(id);

            if (el && !el.value) {
                el.value = val;
                formatInputWithCommas(el);
            }
        });

        ["housePrice",
            "middleDown",
            "investorDown",
            "sipAmount",
            "targetCorpus",
            "durSipAmount",
            "durTargetCorpus",
            "roiSipAmount",
            "roiTargetCorpus",
            "swpCorpus",
            "swpWithdrawal",
            "swpReqWithdrawal",
            "amortPrincipal",
        ].forEach((id) => {
            const input = document.getElementById(id);
            const wordsId = amountWordsMap[id];
            if (!input || !wordsId) return;
            const raw = parseNumber(input.dataset.raw || input.value);

            if (raw > 0) {
                document.getElementById(wordsId).innerHTML = numberToWords(raw,
                    currentCurrency);
            }
        });
        document.getElementById("enableStepUpStandard").checked = true;
        document.getElementById("enableStepUpBasic").checked = true;
        document.getElementById("enableStepUpTarget").checked = true;
        document.getElementById("enableStepUpDur").checked = false;
        document.getElementById("enableStepUpRoi").checked = false;

        document.querySelectorAll(".currency-prefix").forEach((el) => {
            el.textContent = currencyConfig[currentCurrency].symbol;
        });

        applyTheme(currentTheme);
        applyViewMode(simpleView ? "simple" : "advanced");
        setMode("sip-basic");
        recalcExpenses();
    }

    initDefaults();
})();
