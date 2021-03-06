/**
 * - Deploy a new smart contract
 * - Cannot call private method
 * - Payable methods receive funds correctly
 * - Only owner access to protected methods
 * - Test latest protection to popular attacks
 */

const { convertPhtToWeiBN, calculateGasCostBN, extractEnvAccountAndPwd } = require('./utils');

const HelloBlockchainWorld = artifacts.require("HelloBlockchainWorld");

contract('SmartContract', () => {
  let ROOT_ACCOUNT = extractEnvAccountAndPwd(process.env.NETWORK).from;
  let NEW_ACCOUNT_ADDR;
  const NEW_ACCOUNT_PASS = "password";

  it("should return the msg.sender when reading the owner attribute", async () => {
    const instance = await HelloBlockchainWorld.deployed();
    const owner = await instance.owner.call();
    assert.equal(web3.utils.toChecksumAddress(owner), web3.utils.toChecksumAddress(ROOT_ACCOUNT), "Owner doesn't match the msg.sender");
  });

  it("should create an account for testing purposes and feed it with tokens, not asserting", async () => {
    NEW_ACCOUNT_ADDR = await web3.eth.personal.newAccount(NEW_ACCOUNT_PASS);
    await web3.eth.personal.unlockAccount(NEW_ACCOUNT_ADDR, NEW_ACCOUNT_PASS, 1000);

    await web3.eth.sendTransaction({
      from: ROOT_ACCOUNT,
      to: NEW_ACCOUNT_ADDR,
      value: convertPhtToWeiBN("0.1") // 0.1 PHTs should be enough to perform Transactions
    });
  });

  it("should deduct gas cost performing a failed transaction", async () => {
    const instance = await HelloBlockchainWorld.deployed();
    const weiBNBalancePreTxBN = web3.utils.toBN(await web3.eth.getBalance(NEW_ACCOUNT_ADDR));

    let txReceipt;
    try {
      const tx = await instance.incrementHelloCount({
        from: NEW_ACCOUNT_ADDR,
        gas: "30000", // Shouldn't take more than 30 000 to perform a failed TX
      });
      txReceipt = tx.receipt;
    } catch (e) {
      txReceipt = e.receipt;
      if (typeof e.receipt === 'undefined') {
        assert(false, e.message)
      }
    }

    const weiBNBalancePostTx = await web3.eth.getBalance(NEW_ACCOUNT_ADDR);
    const gasCostBN = await calculateGasCostBN(txReceipt.gasUsed);
    const expectedBalanceBN = weiBNBalancePreTxBN.sub(gasCostBN);

    assert.equal(txReceipt.status, "0x0", "failed TX status expected");
    assert.equal(weiBNBalancePostTx, expectedBalanceBN.toString());
  });

  it("should be allowed to perform a smart contract transaction and gas should be reduced from the balance", async () => {
    const instance = await HelloBlockchainWorld.deployed();
    const weiBNBalancePreTxBN = web3.utils.toBN(await web3.eth.getBalance(ROOT_ACCOUNT));
    
    try {
      const estimatedGas = await instance.incrementHelloCount.estimateGas();
      const tx = await instance.incrementHelloCount({
        from: ROOT_ACCOUNT,
        gas: estimatedGas,
      });

      const weiBNBalancePostTxBN = web3.utils.toBN(await web3.eth.getBalance(ROOT_ACCOUNT));
      const txGasCostBN = await calculateGasCostBN(tx.receipt.gasUsed);
      const expectedBalanceBN = weiBNBalancePreTxBN.sub(txGasCostBN);
      const emitedEvent = tx.receipt.logs[0];

      assert.equal(tx.receipt.status, "0x1", "successful TX status expected");
      assert.equal(emitedEvent.event, "HelloCountIncremented");
      assert.equal(emitedEvent.blockHash, tx.receipt.blockHash);
      assert.equal(weiBNBalancePostTxBN.toString(), expectedBalanceBN.toString(), "correct balance - gas cost expected");
      assert(weiBNBalancePreTxBN.sub(weiBNBalancePostTxBN).lt(convertPhtToWeiBN("0.05")), "performing a SC TX should not cost more than 0.05 PHT")
    } catch (e) {
      assert(false, e.message);
    }
  });
});
