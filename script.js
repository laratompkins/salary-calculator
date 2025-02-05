// Format number with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Parse number with commas
function parseFormattedNumber(str) {
    return parseInt(str.replace(/,/g, '')) || 0;
}

// Base salary formatting
const baseSalaryInput = document.getElementById('baseSalary');

baseSalaryInput.addEventListener('blur', function() {
    const value = parseFormattedNumber(this.value);
    if (value) {
        this.value = formatNumber(value);
    }
});

baseSalaryInput.addEventListener('focus', function() {
    const value = parseFormattedNumber(this.value);
    if (value) {
        this.value = value.toString();
    }
});

document.getElementById('salaryForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const baseSalary = parseFormattedNumber(document.getElementById('baseSalary').value);
    if (!baseSalary) {
        alert('Please enter a valid base salary');
        return;
    }
    
    const colaRates = [];
    const yearNumbers = [];
    let hasInput = false;
    
    // Collect COLA rates, but only for years with input
    for (let i = 1; i <= 5; i++) {
        const colaInput = document.getElementById(`cola${i}`);
        if (colaInput.value !== '') {
            hasInput = true;
            colaRates.push(parseFloat(colaInput.value));
            yearNumbers.push(i);
        }
    }
    
    if (!hasInput) return;
    
    // Calculate results for each year with input
    const results = colaRates.map((cola, index) => {
        const stipend = (baseSalary * cola) / 100;
        const sursEarnings = baseSalary + stipend;
        return {
            year: yearNumbers[index],
            cola: cola.toFixed(1),
            stipend: stipend.toFixed(2),
            sursEarnings: sursEarnings.toFixed(2)
        };
    });
    
    // Calculate differences from Year 1
    const year1Surs = parseFloat(results[0].sursEarnings);
    results.forEach((result, index) => {
        if (index === 0) {
            // First year is null (will be displayed as dash)
            result.difference = null;
        } else {
            // Compare current SURS to Year 1 SURS
            const currentSurs = parseFloat(result.sursEarnings);
            result.difference = currentSurs - year1Surs;
            result.difference = result.difference.toFixed(2);
        }
    });
    
    updateTable(results, baseSalary);
    
    // Show results
    document.getElementById('results').classList.remove('hidden');
});

function updateTable(results, baseSalary) {
    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';
    
    // Update table headers
    const thead = document.querySelector('.table-container table thead tr');
    thead.innerHTML = '<th scope="col"></th>';
    results.forEach(result => {
        thead.innerHTML += `<th scope="col">Year ${result.year}</th>`;
    });
    
    // Base Salary row
    const baseSalaryRow = document.createElement('tr');
    baseSalaryRow.innerHTML = `
        <td>Base Salary</td>
        ${results.map(() => `<td>$${baseSalary.toLocaleString()}</td>`).join('')}
    `;
    tbody.appendChild(baseSalaryRow);
    
    // COLA row
    const colaRow = document.createElement('tr');
    colaRow.innerHTML = `
        <td>COLA</td>
        ${results.map(r => `<td>${r.cola}%</td>`).join('')}
    `;
    tbody.appendChild(colaRow);
    
    // Stipend row
    const stipendRow = document.createElement('tr');
    stipendRow.innerHTML = `
        <td>Stipend</td>
        ${results.map(r => `<td>$${parseFloat(r.stipend).toLocaleString()}</td>`).join('')}
    `;
    tbody.appendChild(stipendRow);
    
    // SURS Period Earnings row
    const sursRow = document.createElement('tr');
    sursRow.innerHTML = `
        <td>SURS Period Earnings</td>
        ${results.map(r => `<td>$${parseFloat(r.sursEarnings).toLocaleString()}</td>`).join('')}
    `;
    tbody.appendChild(sursRow);
    
    // Change from Year 1 row
    const differenceRow = document.createElement('tr');
    differenceRow.innerHTML = `
        <td>Change from Year 1</td>
        ${results.map((r, index) => {
            if (index === 0) return '<td class="zero">$0.00</td>';
            const changeValue = parseFloat(r.difference);
            const className = changeValue > 0 ? 'positive' : changeValue < 0 ? 'negative' : 'zero';
            const sign = changeValue > 0 ? '+' : changeValue < 0 ? '-' : '';
            const formattedChange = Math.abs(changeValue).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            return `<td class="${className}">${sign}$${formattedChange}</td>`;
        }).join('')}
    `;
    tbody.appendChild(differenceRow);
    
    // Show results section
    document.getElementById('results').classList.remove('hidden');
}

function parseFormattedNumber(value) {
    // Remove any commas and convert to float
    return parseFloat(value.replace(/,/g, ''));
}

function exportToExcel() {
    // Get table data
    const table = document.querySelector('.table-container table');
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
    
    // Get rows and convert values to proper types
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
        const label = tr.querySelector('td:first-child').textContent.trim();
        const cells = Array.from(tr.querySelectorAll('td:not(:first-child)'));
        
        return [label, ...cells.map(td => {
            const value = td.textContent;
            
            // Handle different data types based on row label
            switch(label) {
                case 'COLA':
                    // Convert percentage string to number (e.g., "2.00%" -> 0.02)
                    return parseFloat(value.replace('%', '')) / 100;
                case 'Base Salary':
                case 'Stipend':
                case 'SURS Period Earnings':
                case 'Change from Year 1': 
                    // Convert currency string to number (e.g., "$50,000" -> 50000)
                    return parseFloat(value.replace(/[$,]/g, ''));
                default:
                    return value;
            }
        })];
    });
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Create worksheet data with headers
    const wsData = [headers, ...rows];
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    const colWidths = [
        { wch: 15 },  // First column
        { wch: 12 },  // Other columns
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 }
    ];
    ws['!cols'] = colWidths;
    
    // Style the cells
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws[cellRef];
            if (!cell) continue;
            
            // Add cell style object if it doesn't exist
            if (!cell.s) cell.s = {};
            
            // Header row styling
            if (R === 0) {
                cell.s.fill = { fgColor: { rgb: "9580FF" } };
                cell.s.font = { bold: true, color: { rgb: "000000" } };
                cell.s.alignment = { horizontal: "left" };
            }
            // Data styling
            else {
                // Get row label
                const rowLabel = wsData[R][0].trim();
                
                // Stripe even rows
                if (R % 2 === 0) {
                    cell.s.fill = { fgColor: { rgb: "2D2D2D" } };
                }
                
                // First column styling
                if (C === 0) {
                    cell.s.font = { name: "Lexend Deca" };
                    cell.s.alignment = { horizontal: "left" };
                }
                // Number columns
                else {
                    cell.s.font = { name: "PT Mono" };
                    cell.s.alignment = { horizontal: "right" };
                    
                    // Apply number formats based on row type
                    switch(rowLabel) {
                        case 'COLA':
                            cell.z = '0.00%';
                            break;
                        case 'Base Salary':
                        case 'Stipend':
                        case 'SURS Period Earnings':
                        case 'Change from Year 1': 
                            cell.z = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';
                            break;
                    }
                    
                    // Color coding for changes (now using actual numbers)
                    const value = cell.v;
                    if (typeof value === 'number') {
                        if (rowLabel === 'Change from Year 1') {
                            // For Change from Year 1, only color negative values red
                            if (value < 0) {
                                cell.s.font.color = { rgb: "FF6B6B" };
                            }
                        } else {
                            // For other rows, keep existing color logic
                            if (value > 0) {
                                cell.s.font.color = { rgb: "4CAF50" };
                            } else if (value < 0) {
                                cell.s.font.color = { rgb: "FF6B6B" };
                            } else {
                                cell.s.font.color = { rgb: "808080" };
                            }
                        }
                    }
                }
            }
            
            // Common styles
            cell.s.border = {
                bottom: { style: 'thin', color: { rgb: "404040" } }
            };
        }
    }
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Salary Projection");
    
    // Generate Excel file
    XLSX.writeFile(wb, "salary-projection.xlsx");
}

document.getElementById('exportBtn').addEventListener('click', exportToExcel);

document.getElementById('clearBtn').addEventListener('click', function() {
    document.getElementById('salaryForm').reset();
    document.getElementById('results').classList.add('hidden');
});
