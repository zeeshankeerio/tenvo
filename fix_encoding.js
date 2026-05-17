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
            results = results.concat(walk(file));
        } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = [...walk('components'), ...walk('app'), ...walk('lib')];
let totalFixes = 0;

const replacements = {
    'â€™': "'",
    'â€“': "-",
    'â€”': "-",
    'âœ…': "✅",
    'âŒ': "❌",
    'âŒ›': "⌛",
    'âš ï¸ ': "⚠️",
    'â†’': "→",
    'â† ': "←",
    'â€œ': '"',
    'â€': '"',
    'â€¢': "•",
    // Adding extra fix for trailing 'â€' when 'â€“' etc aren't matched properly or part of a sequence
    'â€': "" 
};

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let original = content;

    for (const [bad, good] of Object.entries(replacements)) {
        // Use global regex replacement for each string
        // Note: some strings have regex special characters but none of our replacements do except maybe brackets, but they are just literal strings here. Let's use split/join for safety.
        content = content.split(bad).join(good);
    }
    
    // Also target the empty square symbol 'âŒ' -> âŒ which is 'â' followed by non-printable characters. We can handle it explicitly if we see more.
    content = content.split('âŒ').join('❌');

    if (content !== original) {
        fs.writeFileSync(f, content, 'utf8');
        totalFixes++;
        console.log('Fixed:', f);
    }
});

console.log('Total files fixed:', totalFixes);
