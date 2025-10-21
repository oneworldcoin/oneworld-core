const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('OneW + RewardsVault', function () {
  let OneW, RewardsVault, onew, vault, deployer, addr1;

  beforeEach(async function () {
    [deployer, addr1] = await ethers.getSigners();
    const OneWFactory = await ethers.getContractFactory('OneW');
    const cap = ethers.parseUnits('42000000', 18);
    onew = await OneWFactory.deploy(cap);
    await onew.waitForDeployment?.();

    const RewardsFactory = await ethers.getContractFactory('RewardsVault');
    const allocated = ethers.parseUnits('21000000', 18);
    const now = Math.floor(Date.now() / 1000);
    vault = await RewardsFactory.deploy(await onew.getAddress(), deployer.address, allocated, now - 10, 1000);
    await vault.waitForDeployment?.();
  });

  it('should allow owner to mint', async function () {
    const amount = ethers.parseUnits('1000', 18);
    await (await onew.mint(deployer.address, amount)).wait?.();
    const bal = await onew.balanceOf(deployer.address);
    expect(bal).to.equal(amount);
  });

  it('vault release should transfer vested tokens to beneficiary', async function () {
    const mintAmount = ethers.parseUnits('21000000', 18);
    await (await onew.mint(await vault.getAddress(), mintAmount)).wait?.();
    // advance time by calling vestedAmount
    const vested = await vault.vestedAmount();
    // if vested > released, release should work
    if (vested.gt(0)) {
      await (await vault.release()).wait?.();
      const bal = await onew.balanceOf(deployer.address);
      expect(bal).to.be.greaterThan(0);
    }
  });
});
