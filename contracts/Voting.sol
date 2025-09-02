// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Voting {
    address public admin;

    struct Candidate {
        string name;
        uint voteCount;
    }

    Candidate[] public candidates;

    mapping(address => bool) public isVoter;
    mapping(address => bool) public hasVoted;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor(string[] memory candidateNames) {
        admin = msg.sender;
        for (uint i = 0; i < candidateNames.length; i++) {
            candidates.push(Candidate(candidateNames[i], 0));
        }
    }

    function registerVoter(address voter) public onlyAdmin {
        isVoter[voter] = true;
    }

    function vote(uint candidateIndex) public {
        require(isVoter[msg.sender], "Not registered");
        require(!hasVoted[msg.sender], "Already voted");
        require(candidateIndex < candidates.length, "Invalid candidate");

        hasVoted[msg.sender] = true;
        candidates[candidateIndex].voteCount++;
    }

    function getCandidatesCount() public view returns (uint) {
        return candidates.length;
    }
}
