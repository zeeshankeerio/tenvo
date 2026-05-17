const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            // Ignore node_modules, .next, etc
            if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
                results = results.concat(walk(file));
            }
        } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = [...walk('components'), ...walk('app'), ...walk('lib')];
let totalFixes = 0;

const replacements = {
    // Emojis and Symbols
    '✅': '[OK]',
    '❌': '[X]',
    '⚠️': '[WARNING]',
    '⌛': '[WAIT]',
    '🔍': '[SEARCH]',
    '📉': '[DECREASE]',
    '🚨': '[ALERT]',
    '🧪': '[TEST]',
    '📊': '[CHART]',
    '📋': '[CLIPBOARD]',
    '🌗': '[PARTIAL]',
    '🌴': '[LEAVE]',
    '🎉': '[CELEBRATION]',
    '🛍️': '[BAG]',
    '🥤': '[DRINK]',
    '🍿': '[SNACK]',
    '🥛': '[MILK]',
    '🧊': '[ICE]',
    '🥬': '[FRESH]',
    '🍞': '[BREAD]',
    '🏠': '[HOUSE]',
    '🧼': '[SOAP]',
    '🥩': '[MEAT]',
    '📦': '[BOX]',
    '🔴': '[RED]',
    '🟡': '[YELLOW]',
    '🛡️': '[SHIELD]',

    // Punctuation and Typography
    '’': "'",
    '‘': "'",
    '“': '"',
    '”': '"',
    '—': '--', // em dash
    '–': '-',  // en dash
    '•': '*',  // bullet
    '→': '->',
    '←': '<-',
    '™': '(TM)',
    '©': '(C)',
    '®': '(R)',
    '…': '...',

    // Box drawing characters
    '─': '-',
    '│': '|',
    '┌': '+',
    '┐': '+',
    '└': '+',
    '┘': '+',
    '├': '+',
    '┤': '+',
    '┬': '+',
    '┴': '+',
    '┼': '+',
    '╭': '+',
    '╮': '+',
    '╰': '+',
    '╯': '+',
    '═': '=',
    '║': '|'
};

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let original = content;

    for (const [bad, good] of Object.entries(replacements)) {
        content = content.split(bad).join(good);
    }
    
    // Also remove any remaining bytes that start with E2 if they are standalone or corrupted, 
    // but the above covers all the intentional UTF-8 characters we've seen.

    if (content !== original) {
        fs.writeFileSync(f, content, 'utf8');
        totalFixes++;
        console.log('Fixed Unicode to ASCII in:', f);
    }
});

console.log('Total files fixed:', totalFixes);
