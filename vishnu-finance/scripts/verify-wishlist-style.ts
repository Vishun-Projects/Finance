import { generateAndSaveImagenImage } from '../src/lib/imagen';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function verifyNewStyleAndWishlist() {
    console.log('--- Verifying New AI Image Style ---');
    const newsPrompt = "Indian stock market reaches all time high, finance news";
    console.log(`Testing style for prompt: "${newsPrompt}"`);

    try {
        const result = await generateAndSaveImagenImage(newsPrompt, 'uploads/test-style');
        if (result) {
            console.log(`✅ Style Success! Image saved at: ${result}`);
        } else {
            console.log('❌ Style Failed.');
        }
    } catch (e) {
        console.error('💥 Execution error (Style):', e);
    }

    console.log('\n--- Verifying Wishlist Image Generation ---');
    const wishlistPrompt = "New MacBook Pro M4 for productivity and trading";
    console.log(`Testing wishlist for prompt: "${wishlistPrompt}"`);

    try {
        const result = await generateAndSaveImagenImage(wishlistPrompt, 'uploads/wishlist');
        if (result) {
            console.log(`✅ Wishlist Success! Image saved at: ${result}`);
        } else {
            console.log('❌ Wishlist Failed.');
        }
    } catch (e) {
        console.error('💥 Execution error (Wishlist):', e);
    }
}

verifyNewStyleAndWishlist();
