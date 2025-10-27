// A comprehensive, multi-day automation bot for the Helios Testnet.
// This script performs multiple, parallel task schedules, repeats 10 times with an interval,
// and then waits until the same time the next day to start again.
// deps: npm i viem dotenv
import 'dotenv/config';
import { createWalletClient, createPublicClient, http, parseUnits, maxUint256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import crypto from 'crypto'; // Added for random salt generation

// ---------- env ----------
const RPC_URL   = process.env.RPC_URL?.trim();
const PRIV_KEY  = process.env.PRIVATE_KEY?.trim();
const CHAIN_ID  = Number(process.env.CHAIN_ID || 0);

if (!RPC_URL || !PRIV_KEY) {
  console.error('❌ Missing RPC_URL or PRIVATE_KEY in .env');
  process.exit(1);
}

// ---------- Schedule Configuration ----------
// Main tasks (10 runs, 1h 5m interval)
const MAIN_RUNS_PER_SESSION = 10;
const MAIN_INTERVAL_HOURS = 1;
const MAIN_INTERVAL_MINUTES = 5;
const MAIN_RUN_INTERVAL_MS = (MAIN_INTERVAL_HOURS * 60 + MAIN_INTERVAL_MINUTES) * 60 * 1000;

// Token Deploy task (3 runs, 1h 5m interval)
const TOKEN_RUNS_PER_SESSION = 3;
const TOKEN_INTERVAL_HOURS = 1;
const TOKEN_INTERVAL_MINUTES = 5;
const TOKEN_RUN_INTERVAL_MS = (TOKEN_INTERVAL_HOURS * 60 + TOKEN_INTERVAL_MINUTES) * 60 * 1000;

// Bridge task has been removed as requested.

const DELAY_BETWEEN_TASKS_MS = 10000; // 10-second pause between individual tasks

// --- Fee Configuration ---
// Set a high, consistent gas price (200 Gwei) to ensure transactions are prioritized.
const HIGH_GAS_PRICE = 200_000_000_000n; // 200 Gwei

// ---------- clients ----------
const account = privateKeyToAccount(PRIV_KEY);
const transport = http(RPC_URL, { timeout: 180_000 }); // 3 minute timeout for transactions
const wallet = createWalletClient({ account, transport, chain: { id: CHAIN_ID, nativeCurrency: { name: 'NATIVE', symbol: 'NAT', decimals: 18 } } });
const publicClient = createPublicClient({ transport });

// ===================================================================================
// TASK 1: DEPLOY SIMPLE SMART CONTRACT
// ===================================================================================
async function task_deployContract() {
    console.log("\n--- TASK 1: Deploying a new Smart Contract ---");
    // Simple 'Counter' contract
    const counterAbi = [{"inputs":[],"name":"count","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"increment","outputs":[],"stateMutability":"nonpayable","type":"function"}];
    const counterBytecode = '0x608060405234801561001057600080fd5b50610100806100206000396000f3fe6080604052348015600f57600080fd5b506004361060325760003560e01c806360fe47b11460375780638381f58a146059575b600080fd5b605760048036038101906053565b6076565b005b605f607e565b604051606c9190608d565b60405180910390f35b60008054905090565b60005481565b600080546001019055565b608791905b80821115609d576000818152602081019051609392919160010160a3565b505050565b60006020828403121560b457600080fd5b503591905056fea2646970667358221220a2e51921201a9160358e2d46e279a1f7344b5fb227f722955f240214a1c09b3064736f6c63430008090033';

    const hash = await wallet.deployContract({
        abi: counterAbi,
        bytecode: counterBytecode,
        args: [],
        gasPrice: HIGH_GAS_PRICE
    });

    console.log(`  ⛓  Deploy Tx Hash: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
        console.log(`  ✅ Contract Deployed! Address: ${receipt.contractAddress}, Block: ${receipt.blockNumber}`);
    } else {
        console.log(`  ❌ Contract deployment failed.`);
    }
}


// ===================================================================================
// TASK 2: CREATE RANDOM TOKEN
// ===================================================================================
async function task_createToken() {
    console.log("\n--- TASK 2: Creating a new ERC20 Token ---");
    const TOKEN_DEPLOYER_ADDRESS = "0x0000000000000000000000000000000000000806";
    const TOKEN_DEPLOYER_ABI = [{"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"symbol","type":"string"},{"internalType":"string","name":"denom","type":"string"},{"internalType":"uint256","name":"totalSupply","type":"uint256"},{"internalType":"uint8","name":"decimals","type":"uint8"},{"internalType":"string","name":"logoBase64","type":"string"}],"name":"createErc20","outputs":[{"internalType":"address","name":"tokenAddress","type":"address"}],"stateMutability":"nonpayable","type":"function"}];
    
    const name = "AutoToken" + Math.floor(Math.random() * 10000);
    const symbol = "ATK" + Math.floor(Math.random() * 1000);
    const denom = `a${symbol.toLowerCase()}-${Date.now()}`;
    const totalSupply = parseUnits("1000000", 18);

    const hash = await wallet.writeContract({
        address: TOKEN_DEPLOYER_ADDRESS,
        abi: TOKEN_DEPLOYER_ABI,
        functionName: 'createErc20',
        args: [name, symbol, denom, totalSupply, 18, ''],
        gasPrice: HIGH_GAS_PRICE
    });

    console.log(`  ⛓  Tx Hash: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(receipt.status === 'success' ? `  ✅ Token Created! Block: ${receipt.blockNumber}` : `  ❌ Token creation failed.`);
}

// ===================================================================================
// TASK 3: MINT NFT
// ===================================================================================
async function task_mintNft() {
    console.log("\n--- TASK 3: Minting an NFT ---");
    const NFT_CONTRACT_ADDRESS = '0x9b0C569E2F63CEC5066f9f13C78bA0C6777322aa';
    const NFT_MINT_DATA = '0x57bc3d7800000000000000000000000081860e8fec3115e6809be409cf5059a91b7be83e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

    const hash = await wallet.sendTransaction({
        to: NFT_CONTRACT_ADDRESS,
        data: NFT_MINT_DATA,
        gasPrice: HIGH_GAS_PRICE
    });

    console.log(`  ⛓  Tx Hash: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(receipt.status === 'success' ? `  ✅ NFT Minted! Block: ${receipt.blockNumber}` : `  ❌ NFT mint failed.`);
}


// ===================================================================================
// TASK 4: CLAIM & BURN SEQUENCE
// ===================================================================================
async function task_claimAndBurn() {
    console.log("\n--- TASK 4: Claim & Burn Sequence (4 Steps) ---");
    const DELAY_BETWEEN_SUBTASKS_MS = 5000;

    // Sub-task 1: Claim ORE
    console.log("  ➡️  1. Claiming ORE...");
    await sendSubtask('0x0B1Bb8520a3443b43FA66B123f6C69aEBa41e7Cc', '0x4e71d92d');
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_SUBTASKS_MS));

    // Sub-task 2: Claim MLUNARI
    console.log("  ➡️  2. Claiming MLUNARI...");
    await sendSubtask('0xEb3D9727D5bcAf5F792FA2eCFF73f6A9448c036B', '0x1e83409a000000000000000000000000c36e9b957e218cda978bd1b95745f15d8cedb3c4');
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_SUBTASKS_MS));

    // Sub-task 3: Approve ORE for Burn (NEW)
    console.log("  ➡️  3. Approving ORE for burn...");
    await sendSubtask(
        '0xC36e9B957E218cDa978bd1B95745f15d8CEDb3C4', 
        '0x095ea7b3000000000000000000000000eb3d9727d5bcaf5f792fa2ecff73f6a9448c036b0000000000000000000000000000000000000000000000000de0b6b3a7640000'
    );
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_SUBTASKS_MS));
    
    // Sub-task 4: Burn ORE (NEW)
    console.log("  ➡️  4. Burning ORE...");
    await sendSubtask(
        '0xEb3D9727D5bcAf5F792FA2eCFF73f6A9448c036B', 
        '0xf4ec95d5000000000000000000000000c36e9b957e218cda978bd1b95745f15d8cedb3c40000000000000000000000000000000000000000000000000de0b6b3a7640000'
    );
}

// Helper for claim/burn subtasks
async function sendSubtask(to, data) {
    const hash = await wallet.sendTransaction({ 
        to, 
        data,
        gasPrice: HIGH_GAS_PRICE 
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(receipt.status === 'success' ? `    ✅ Success! Block: ${receipt.blockNumber}` : `    ❌ Failed.`);
}


// ===================================================================================
// TASK 5: SWAP TOKENS
// ===================================================================================
async function task_swapTokens() {
    console.log("\n--- TASK 5: Swapping HLS for WETH ---");
    const SWAP_ROUTER_ADDRESS = "0x512320fC42aCFAdc0f6aDA03626a76eD726fDA63";
    const HLS_TOKEN_ADDRESS = "0xD4949664cD82660AaE99bEdc034a0deA8A0bd517";
    const WETH_TOKEN_ADDRESS = "0x80b5a32E4F032B2a058b4F29EC95EEfEEB87aDcd";
    const ERC20_ABI = [{"type":"function","name":"allowance","stateMutability":"view","inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},{"type":"function","name":"approve","stateMutability":"nonpayable","inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"outputs":[{"name":"","type":"bool"}]}];
    
    // CORRECTED AND COMPLETE ABI FOR THE SWAP FUNCTION
    const SOLARISWAP_ABI = [{"type":"function","name":"exactInputSingle","stateMutability":"payable","inputs":[{"components":[{"internalType":"address","name":"tokenIn","type":"address"},{"internalType":"address","name":"tokenOut","type":"address"},{"internalType":"uint24","name":"fee","type":"uint24"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"deadline","type":"uint256"},{"internalType":"uint256","name":"amountIn","type":"uint256"},{"internalType":"uint256","name":"amountOutMinimum","type":"uint256"},{"internalType":"uint160","name":"sqrtPriceLimitX96","type":"uint160"}],"internalType":"struct ISwapRouter.ExactInputSingleParams","name":"params","type":"tuple"}],"outputs":[{"internalType":"uint256","name":"amountOut","type":"uint256"}]}];

    const amountInWei = parseUnits("1", 18);

    const allowance = await publicClient.readContract({ address: HLS_TOKEN_ADDRESS, abi: ERC20_ABI, functionName: 'allowance', args: [account.address, SWAP_ROUTER_ADDRESS] });
    if ( allowance < amountInWei ) {
        console.log("  - Approving token for swap...");
        const approveHash = await wallet.writeContract({ 
            address: HLS_TOKEN_ADDRESS, 
            abi: ERC20_ABI, 
            functionName: 'approve', 
            args: [SWAP_ROUTER_ADDRESS, maxUint256],
            gasPrice: HIGH_GAS_PRICE
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        console.log("  ✅ Approval complete.");
    } else {
        console.log("  - Token already approved.");
    }

    console.log("  - Executing swap...");
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
    const swapParams = { tokenIn: HLS_TOKEN_ADDRESS, tokenOut: WETH_TOKEN_ADDRESS, fee: 3000, recipient: account.address, deadline, amountIn: amountInWei, amountOutMinimum: 0n, sqrtPriceLimitX96: 0n };
    
    const swapHash = await wallet.writeContract({ 
        address: SWAP_ROUTER_ADDRESS, 
        abi: SOLARISWAP_ABI, 
        functionName: 'exactInputSingle', 
        args: [swapParams],
        gasPrice: HIGH_GAS_PRICE
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });
    console.log(receipt.status === 'success' ? `  ✅ Swap successful! Block: ${receipt.blockNumber}` : `  ❌ Swap failed.`);
}


// ===================================================================================
// TASK 6: CREATE MINTPAD NFT
// ===================================================================================
async function task_createMintpadNFT() {
    console.log("\n--- TASK 6: Creating Mintpad NFT (Dynamic Salt) ---");
    const MINTPAD_CONTRACT_ADDRESS = '0xaaae0243007AA3000000d8e8bEeF0a944A0d3900';
    
    // This is the template from your file.
    const TEMPLATE_DATA = '0x00000000000000000000000000000000000000000000000000000000000000000000006081860e8fec3115e6809be409cf5059a91b7be83ebbda4e0bb46bd9a50509b579000000000000000000000000000000000000000000000000000000000099000000000000000000000000000000000000000000000000000000000000000002440000000100000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000018cf78900000000000000000000000000000000000000000000000000000000000000000000000018000402ee0000000081860e8fec3115e6809be409cf5059a91b7be83e0000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000000561776461770000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003415744000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000e0g0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000868747470733a2f2f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    
    // The "salt" is the 32-byte (64-hex) segment right after your address.
    const YOUR_ADDRESS_IN_DATA = '81860e8fec3115e6809be409cf5059a91b7be83e';
    const saltStartIndex = TEMPLATE_DATA.indexOf(YOUR_ADDRESS_IN_DATA) + YOUR_ADDRESS_IN_DATA.length;
    const saltEndIndex = saltStartIndex + 64; // 32 bytes = 64 hex chars

    // Generate a new random 32-byte salt
    const newSalt = crypto.randomBytes(32).toString('hex');

    // Rebuild the data payload with the new salt
    const data = TEMPLATE_DATA.substring(0, saltStartIndex) + newSalt + TEMPLATE_DATA.substring(saltEndIndex);

    console.log(`  - Generated new salt: ${newSalt.substring(0, 10)}...`);

    const hash = await wallet.sendTransaction({
        to: MINTPAD_CONTRACT_ADDRESS,
        data: data,
        gasPrice: HIGH_GAS_PRICE
    });

    console.log(`  ⛓  Tx Hash: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(receipt.status === 'success' ? `  ✅ Mintpad NFT Created! Block: ${receipt.blockNumber}` : `  ❌ Mintpad NFT creation failed.`);
}

// ===================================================================================
// TASK 7: BRIDGE TOKENS (REMOVED)
// ===================================================================================
// async function task_bridgeTokens() { ... } // Function removed


// ===================================================================================
// NEW: TASK-SPECIFIC WORKER LOOPS
// ===================================================================================

/**
 * Runs the main sequence of tasks (1, 3, 4, 5, 6)
 * 10 runs, 1h 5m interval
 */
async function runMainTasks() {
    console.log(">>> [SCHEDULER 1]: Starting MAIN TASKS (10 runs @ 1h 5m interval)...");
    const tasks = [
        task_deployContract,
        task_mintNft,
        task_claimAndBurn,
        task_swapTokens,
        task_createMintpadNFT
    ];

    for (let i = 1; i <= MAIN_RUNS_PER_SESSION; i++) {
        console.log(`\n--- [SCHEDULER 1] Running Main Sequence #${i} of ${MAIN_RUNS_PER_SESSION} ---`);
        const sequenceStartTime = Date.now();
        
        for (const task of tasks) {
            try {
                await task();
            } catch (error) {
                console.error(`❌ A critical error occurred during ${task.name}:`, error?.shortMessage || error?.message || error);
            }
            console.log(`  ... waiting ${DELAY_BETWEEN_TASKS_MS / 1000}s ...`);
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_TASKS_MS));
        }
        
        const sequenceEndTime = Date.now();
        console.log(`--- [SCHEDULER 1] Sequence #${i} finished in ${(sequenceEndTime - sequenceStartTime) / 1000} seconds. ---`);

        if (i < MAIN_RUNS_PER_SESSION) {
            console.log(`\n...[SCHEDULER 1] Waiting ${MAIN_INTERVAL_HOURS}h ${MAIN_INTERVAL_MINUTES}m for next sequence...`);
            await new Promise(resolve => setTimeout(resolve, MAIN_RUN_INTERVAL_MS));
        }
    }
    console.log(">>> [SCHEDULER 1]: ALL MAIN TASKS COMPLETE. <<<");
}

/**
 * Runs the Token Deploy task
 * 3 runs, 1h 5m interval
 */
async function runTokenDeploy() {
    console.log(">>> [SCHEDULER 2]: Starting TOKEN DEPLOY (3 runs @ 1h 5m interval)...");
    
    for (let i = 1; i <= TOKEN_RUNS_PER_SESSION; i++) {
        console.log(`\n--- [SCHEDULER 2] Running Token Deploy #${i} of ${TOKEN_RUNS_PER_SESSION} ---`);
        try {
            await task_createToken();
        } catch (error) {
            console.error(`❌ A critical error occurred during task_createToken:`, error?.shortMessage || error?.message || error);
        }

        if (i < TOKEN_RUNS_PER_SESSION) {
            console.log(`\n...[SCHEDULER 2] Waiting ${TOKEN_INTERVAL_HOURS}h ${TOKEN_INTERVAL_MINUTES}m for next token deploy...`);
            await new Promise(resolve => setTimeout(resolve, TOKEN_RUN_INTERVAL_MS));
        }
    }
    console.log(">>> [SCHEDULER 2]: ALL TOKEN DEPLOYS COMPLETE. <<<");
}

/**
 * Runs the Bridge task (REMOVED)
 */
// async function runBridge() { ... } // Function removed


// ===================================================================================
// MASTER SCHEDULER
// ===================================================================================
async function scheduleDailyRuns() {
    console.log("=================================================");
    console.log("===      Helios Full Automation Bot START     ===");
    console.log("=================================================");
    console.log(`Loaded account: ${account.address}`);
    console.log(`Bot will run multiple task schedules in parallel.`);
    
    while (true) {
        // This is the line that captures the *exact* start time of the session.
        // For example: 2:18 AM, Oct 24
        const sessionStartTime = new Date();
        console.log(`\n\n>>> Starting new daily session at ${sessionStartTime.toLocaleString()} <<<`);

        // Run all three schedulers in parallel.
        // The script will wait here until *all* of them are finished for the day.
        await Promise.all([
            runMainTasks(),
            runTokenDeploy(),
            // runBridge() // Removed from parallel execution
        ]);

        console.log("\n\n>>> Daily session complete. All schedules finished. <<<");
        
        // --- Daily Scheduling Logic ---
        // This is where we calculate the wait time to start again at the *exact same time* tomorrow.
        
        // 1. Create a new Date object based on the *original* start time of this session.
        //    (e.g., If sessionStartTime was 2:18 AM, Oct 24, nextSessionTime is also 2:18 AM, Oct 24)
        const nextSessionTime = new Date(sessionStartTime.getTime());

        // 2. Set this new Date object to be exactly 24 hours (1 day) in the future.
        //    (e.g., nextSessionTime is now 2:18 AM, Oct 25)
        nextSessionTime.setDate(nextSessionTime.getDate() + 1);

        // 3. Calculate the *exact* number of milliseconds from "now" until that future time.
        //    (e.g., 2:18 AM, Oct 25  -  3:30 PM, Oct 24 = ~10.8 hours of wait time)
        const waitTime = nextSessionTime.getTime() - Date.now();

        // --- Just for logging ---
        const waitHours = Math.floor(waitTime / 3600000);
        const waitMinutes = Math.floor((waitTime % 3600000) / 60000);
        // ------------------------

        console.log(`Next session scheduled to start at: ${nextSessionTime.toLocaleString()}`);
        console.log(`Waiting for approximately ${waitHours} hours and ${waitMinutes} minutes to maintain the 24-hour cycle.`);
        
        // 4. Wait for that exact duration. The loop will then restart and run a new session.
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
}

scheduleDailyRuns();

