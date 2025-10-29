const hre = require("hardhat");

async function main() {
  // Load the compiled contract artifact/factory from the artifacts folder
  const Voting = await hre.ethers.getContractFactory("Voting");

  // Define the list of candidate names to be initialized on deployment
  const candidates = ["Harsh", "Aditi", "Arjun", ""];
  const voting = await Voting.deploy(candidates);

  await voting.waitForDeployment();

  console.log("Voting contract deployed to:", await voting.getAddress());
  console.log("Ensure to copy this address to CONTRACT_ADDRESS in frontend/src/App.js");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
