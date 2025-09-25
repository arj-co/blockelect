// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Voting {
    // Address of the contract deployer who acts as the system administrator
    address public admin;

    // Structural representation of a candidate in the ballot
    struct Candidate {
        string name;
        uint voteCount;
    }

    // List of candidates running in the election
    Candidate[] public candidates;

    // Mapping to track voter registration status and whether they have cast their vote
    mapping(address => bool) public isVoter;
    mapping(address => bool) public hasVoted;

    // Modifier to restrict access to administrator-only functions
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    // Constructor to initialize the list of candidates at deployment time
    constructor(string[] memory candidateNames) {
        admin = msg.sender;
        for (uint i = 0; i < candidateNames.length; i++) {
            candidates.push(Candidate(candidateNames[i], 0));
        }
    }

    // Registers a specific wallet address as an eligible voter
    function registerVoter(address voter) public onlyAdmin {
        isVoter[voter] = true;
    }

    // Casts a vote for a candidate. Requires voter registration, one-time voting, and valid index.
    function vote(uint candidateIndex) public {
        require(isVoter[msg.sender], "Not registered");
        require(!hasVoted[msg.sender], "Already voted");
        require(candidateIndex < candidates.length, "Invalid candidate");

        hasVoted[msg.sender] = true;
        candidates[candidateIndex].voteCount++;
    }

    // Helper function to return total candidates length
    function getCandidatesCount() public view returns (uint) {
        return candidates.length;
    }
}
