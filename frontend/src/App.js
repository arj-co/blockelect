import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import Voting from "./Voting.json";
import "./App.css";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function App() {
  // ── State ──
  const [account, setAccount] = useState(null); // Current user's connected wallet address
  const [contract, setContract] = useState(null); // Instantiated Ethers.js Voting contract object
  const [candidates, setCandidates] = useState([]); // List of candidate structs loaded from blockchain
  const [loading, setLoading] = useState(false); // UI loading spinner toggle
  const [networkName, setNetworkName] = useState(null); // Chain name for the current provider
  const [error, setError] = useState(null); // Global error messages/toast contents
  const [successMessage] = useState(null); // Global success messages/toast contents
  const [votingIndex, setVotingIndex] = useState(null); // Index of candidate currently being voted for
  const [contractExists, setContractExists] = useState(null); // Flag check if bytecode exists at deployed address

  // Page routing
  const [currentPage, setCurrentPage] = useState("home");

  // Theme
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("blockelect-theme");
    return saved || "dark";
  });

  // ── Theme Sync Effect ──
  // Updates the data-theme attribute on root html node to swap CSS variables
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("blockelect-theme", theme);
  }, [theme]);

  // Handler to toggle light/dark modes
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // Preview data
  const previewCandidates = [
    { name: "Harsh", voteCount: "0" },
    { name: "Aditi", voteCount: "0" },
    { name: "Arjun", voteCount: "0" },
  ];

  // ── Routing ──
  const navigate = useCallback((page) => {
    const path = page === "home" ? "/" : `/${page}`;
    window.history.pushState({}, "", path);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const pathMap = { "/": "home", "/about": "about", "/docs": "docs", "/success": "success" };
    const path = window.location.pathname;
    setCurrentPage(pathMap[path] || "home");

    const onPop = () => {
      const p = window.location.pathname;
      setCurrentPage(pathMap[p] || "home");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ── Contract probe ──
  // Check if contract bytecode is active at target address before starting client interactions
  useEffect(() => {
    async function probeContract() {
      if (!window.ethereum) {
        setContractExists(false);
        return;
      }
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        setNetworkName(network.name || `chain ${network.chainId}`);
        // Fetch contract bytecode; will be "0x" if not deployed on this network
        const code = await provider.getCode(CONTRACT_ADDRESS);
        setContractExists(code && code !== "0x");
      } catch (err) {
        console.error("Probe failed", err);
        setContractExists(false);
      }
    }
    probeContract();
  }, []);

  // ── Wallet ──
  async function connectWallet() {
    // 1. Check if MetaMask / EIP-1193 provider is injected in the window context
    if (!window.ethereum) {
      setError("MetaMask not detected. Please install MetaMask to continue.");
      return;
    }
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      // 2. Request user authorization to connect accounts
      await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      setNetworkName(network.name || `chain ${network.chainId}`);

      // 3. Verify that the Voting contract code is deployed on the current connected network
      const code = await provider.getCode(CONTRACT_ADDRESS);
      if (code === "0x") {
        setError(
          `No contract at ${CONTRACT_ADDRESS} on ${network.name || network.chainId}. Switch networks or deploy there.`
        );
        return;
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const votingContract = new ethers.Contract(CONTRACT_ADDRESS, Voting.abi, signer);

      setAccount(address);
      setContract(votingContract);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to connect wallet");
    }
  }

  // Reset component wallet connection status and clear current contract queries
  function disconnectWallet() {
    setAccount(null);
    setContract(null);
    setCandidates([]);
  }

  // ── Candidates ──
  // Queries candidate list length from contract and maps candidate records to local array
  const loadCandidates = useCallback(async () => {
    if (!contract) return;
    setLoading(true);
    try {
      const countRaw = await contract.getCandidatesCount();
      const count = Number(countRaw.toString ? countRaw.toString() : countRaw);
      const list = [];
      // Synchronously retrieve names and vote tallies for all candidates
      for (let i = 0; i < count; i++) {
        const c = await contract.candidates(i);
        const name = c.name ?? c[0] ?? "";
        const votes = c.voteCount ?? c[1] ?? 0;
        list.push({
          name: name || "Unnamed",
          voteCount: votes.toString ? votes.toString() : String(votes),
        });
      }
      setCandidates(list);
    } catch (err) {
      console.error(err);
      setError("Failed to load candidates (see console)");
    } finally {
      setLoading(false);
    }
  }, [contract]);

  async function vote(index) {
    if (!contract) return;
    try {
      // Set the candidate index currently being voted to display the UI loading spinner
      setVotingIndex(index);
      // Initiate the on-chain vote transaction
      const tx = await contract.vote(index);
      // Wait for block verification/mining confirmation
      await tx.wait();
      // Reload candidates with updated vote counts
      await loadCandidates();
      navigate("success");
    } catch (err) {
      console.error(err);
      setError(err.message || "Vote failed");
    } finally {
      setVotingIndex(null);
    }
  }

  useEffect(() => {
    if (contract) loadCandidates();
  }, [contract, loadCandidates]);

  // ── Truncate address ──
  const truncAddr = (addr) => addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

  // ══════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════

  return (
    <div className="app">
      {/* Grid background pattern */}
      <div className="grid-bg" />

      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <a className="navbar-logo" href="/" onClick={(e) => { e.preventDefault(); navigate("home"); }}>
          <div className="navbar-logo-icon">B</div>
          BlockElect
        </a>

        <div className="navbar-center">
          <a href="/" className={currentPage === "home" ? "active" : ""} onClick={(e) => { e.preventDefault(); navigate("home"); }}>Home</a>
          <a href="/about" className={currentPage === "about" ? "active" : ""} onClick={(e) => { e.preventDefault(); navigate("about"); }}>About</a>
          <a href="/docs" className={currentPage === "docs" ? "active" : ""} onClick={(e) => { e.preventDefault(); navigate("docs"); }}>Docs</a>
          <a href="https://github.com/arj-co/blockelect" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>

        <div className="navbar-right">
          {!account ? (
            <button className="btn-connect-nav" onClick={connectWallet}>Connect Wallet</button>
          ) : (
            <button className="btn-connect-nav connected" onClick={disconnectWallet} title={account}>
              {truncAddr(account)}
            </button>
          )}
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </nav>
      
      {/* ── TICKER STRIP ── */}
      <div className="ticker-strip">
        <div className="ticker-wrap">
          <div className="ticker-item">This was one of my first-semester freshman projects. To run it locally, begin by starting the Hardhat development network. 😊</div>
          <div className="ticker-item">This was one of my first-semester freshman projects. To run it locally, begin by starting the Hardhat development network. 😊</div>
        </div>
      </div>

      {/* ── PAGE CONTENT ── */}
      <div className="page-content">
        {currentPage === "success" && <SuccessPage navigate={navigate} />}
        {currentPage === "docs" && <DocsPage navigate={navigate} />}
        {currentPage === "about" && <AboutPage navigate={navigate} />}
        {currentPage === "home" && (
          <HomePage
            account={account}
            connectWallet={connectWallet}
            candidates={candidates}
            previewCandidates={previewCandidates}
            loading={loading}
            votingIndex={votingIndex}
            contractExists={contractExists}
            error={error}
            vote={vote}
            navigate={navigate}
            disconnectWallet={disconnectWallet}
            networkName={networkName}
          />
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer-left">BlockElect © 2025</div>
        <div className="footer-center">
          <a href="/" onClick={(e) => { e.preventDefault(); navigate("home"); }}>Home</a>
          <a href="/about" onClick={(e) => { e.preventDefault(); navigate("about"); }}>About</a>
          <a href="/docs" onClick={(e) => { e.preventDefault(); navigate("docs"); }}>Docs</a>
          <a href="https://github.com/arj-co/blockelect" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
        <div className="footer-right">Built on Ethereum • Powered by Smart Contracts</div>
      </footer>

      {/* ── TOAST ── */}
      {successMessage && <div className="toast success">{successMessage}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════ */
function HomePage({ account, connectWallet, candidates, previewCandidates, loading, votingIndex, contractExists, error, vote, navigate, disconnectWallet, networkName }) {
  return (
    <>
      {/* ── HERO ── */}
      <section className="hero-section">
        {/* Visual panel — bg + character layered on right side */}
        <div className="hero-visual">
          {/* Background image */}
          <div className="hero-bg">
            <img className="img-dark" src={`${process.env.PUBLIC_URL}/darkbg.png`} alt="" />
            <img className="img-light" src={`${process.env.PUBLIC_URL}/lightbg.png`} alt="" />
          </div>

          {/* Character subject — pops out centered over bg, 1s delay */}
          <div className="hero-subject">
            <img className="img-dark" src={`${process.env.PUBLIC_URL}/darksub.png`} alt="BlockElect character" />
            <img className="img-light" src={`${process.env.PUBLIC_URL}/lightsub.png`} alt="BlockElect character" />
          </div>
        </div>

        {/* Text content */}
        <div className="hero-content animate-in">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            DECENTRALIZED VOTING PROTOCOL
          </div>

          <h1 className="hero-title">
            Secure Voting,<br />
            <span className="accent">On-Chain.</span>
          </h1>

          <p className="hero-subtitle">
            A transparent, tamper-proof voting system built on Ethereum smart contracts. Every vote is recorded immutably on the blockchain — fully verifiable, fully trustless.
          </p>

          <div className="hero-actions">
            {!account ? (
              <>
                <button className="btn-primary" onClick={connectWallet}>
                  ◇ Connect Wallet
                </button>
                <button className="btn-secondary" onClick={() => navigate("about")}>
                  Learn More →
                </button>
              </>
            ) : (
              <>
                <div className="wallet-info">
                  <span className="note-text">Connected: {account}</span>
                  <span className="note-text">Network: {networkName}</span>
                </div>
                <button className="btn-disconnect" onClick={disconnectWallet}>Disconnect</button>
              </>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>

        {/* Scroll indicator */}
        <div className="scroll-indicator" onClick={() => {
          document.getElementById("candidates-section")?.scrollIntoView({ behavior: "smooth" });
        }}>↓</div>
      </section>

      {/* ── CANDIDATES SECTION ── */}
      <section className="section" id="candidates-section">
        <div className="section-label animate-in">
          {contractExists === null
            ? "DETECTING NETWORK…"
            : contractExists
            ? "LIVE ON-CHAIN"
            : "PREVIEW MODE"}
        </div>
        <h2 className="section-title animate-in delay-1">
          {account ? "Cast Your Vote" : "Meet the Candidates"}
        </h2>
        <p className="section-desc animate-in delay-2">
          {account
            ? "Select a candidate below to cast your on-chain vote. Each registered address can vote exactly once."
            : "Connect your wallet to interact with the smart contract and cast your vote on-chain."}
        </p>

        {loading && <p className="note-text">Loading candidates…</p>}

        {/* Preview candidates (when not connected) */}
        {!account && candidates.length === 0 && (
          <div className="card-grid animate-in delay-3">
            {previewCandidates.map((c, i) => (
              <div key={`preview-${i}`} className={`card candidate-card delay-${i + 3}`} aria-hidden>
                <div className="candidate-header">
                  <h3 className="candidate-name">{c.name}</h3>
                  <div className="candidate-votes">{c.voteCount} votes</div>
                </div>
                <div className="candidate-footer">
                  <span className="candidate-label">Preview</span>
                  <button className="btn-vote" disabled>Vote</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No candidates found */}
        {!loading && candidates.length === 0 && account && (
          <p className="note-text">No candidates found on this contract.</p>
        )}

        {/* Live candidates */}
        {candidates.length > 0 && (
          <div className="card-grid animate-in delay-3">
            {/* Map each candidate fetched from the smart contract to a visual UI card */}
            {candidates.map((c, i) => (
              <div key={i} className="card candidate-card">
                <div className="candidate-header">
                  <h3 className="candidate-name">{c.name}</h3>
                  <div className="candidate-votes">{c.voteCount} votes</div>
                </div>
                <div className="candidate-footer">
                  <span className="candidate-label">Candidate #{i + 1}</span>
                  <button
                    className={`btn-vote ${!votingIndex ? "active" : ""}`}
                    onClick={() => vote(i)}
                    disabled={votingIndex !== null}
                  >
                    {votingIndex === i ? "Voting…" : "Vote"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ═══════════════════════════════════════════
   ABOUT PAGE
   ═══════════════════════════════════════════ */
function AboutPage({ navigate }) {
  const techStack = [
    { icon: "📜", title: "Solidity", desc: "Smart contract language for the Ethereum Virtual Machine. Powers the Voting.sol contract." },
    { icon: "⚡", title: "Ethers.js", desc: "Lightweight library for interacting with Ethereum. Handles wallet connections and contract calls." },
    { icon: "⚛️", title: "React", desc: "Component-based frontend framework. Provides a responsive, dynamic user interface." },
    { icon: "🔨", title: "Hardhat", desc: "Development environment for compiling, deploying, and testing smart contracts locally." },
  ];

  const features = [
    { icon: "🔗", title: "Fully On-Chain", desc: "Every vote is a transaction recorded immutably on the Ethereum blockchain." },
    { icon: "💳", title: "Wallet-Based Identity", desc: "Each voter is identified by their unique Ethereum wallet address — no usernames or passwords." },
    { icon: "✅", title: "One Vote Per Address", desc: "The smart contract ensures each registered address can only cast a single vote." },
    { icon: "🔍", title: "Publicly Verifiable", desc: "Anyone can read the contract state directly — vote counts are transparent and tamper-proof." },
  ];

  const steps = [
    { title: "Start Local Blockchain", desc: "Launch a Hardhat local Ethereum node to simulate the network environment." },
    { title: "Deploy Smart Contract", desc: "Compile and deploy the Voting contract with candidate names initialized at deployment time." },
    { title: "Register Voters", desc: "The admin registers eligible wallet addresses on-chain. Only registered addresses can vote." },
    { title: "Connect Wallet", desc: "Users connect their MetaMask wallet to authenticate and interact with the contract." },
    { title: "Cast Vote", desc: "Users select a candidate and sign an on-chain transaction. The smart contract validates eligibility." },
    { title: "View Results", desc: "Vote counts are read directly from the blockchain — transparent, immutable, and publicly verifiable." },
  ];

  return (
    <>
      {/* About Hero */}
      <section className="section">
        <div className="section-label animate-in">ABOUT BLOCKELECT</div>
        <h2 className="section-title animate-in delay-1">
          Transparent Elections,<br />
          <span className="accent">Powered by Blockchain.</span>
        </h2>
        <p className="section-desc animate-in delay-2">
          BlockElect is a decentralized e-voting system where all voting rules are enforced on-chain using Solidity smart contracts. There is no centralized backend — the frontend is simply an interface to the blockchain.
        </p>
      </section>

      {/* Technology Stack */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-label animate-in">ARCHITECTURE</div>
        <h2 className="section-title animate-in delay-1">Technology Stack</h2>
        <p className="section-desc animate-in delay-2">
          Built with battle-tested Web3 technologies for maximum security and transparency.
        </p>
        <div className="card-grid animate-in delay-3">
          {techStack.map((t, i) => (
            <div key={i} className="card">
              <div className="card-icon">{t.icon}</div>
              <div className="card-title">{t.title}</div>
              <div className="card-desc">{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-label animate-in">KEY FEATURES</div>
        <h2 className="section-title animate-in delay-1">Why BlockElect?</h2>
        <div className="card-grid animate-in delay-2">
          {features.map((f, i) => (
            <div key={i} className="card">
              <div className="card-icon">{f.icon}</div>
              <div className="card-title">{f.title}</div>
              <div className="card-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works — Steps */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-label animate-in">HOW IT WORKS</div>
        <h2 className="section-title animate-in delay-1">Step-by-Step Process</h2>
        <div className="steps-list animate-in delay-2">
          {steps.map((s, i) => (
            <div key={i} className="step-item">
              <div className="step-number">{i + 1}</div>
              <div className="step-content">
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="section-label animate-in">READY TO VOTE?</div>
        <h2 className="section-title animate-in delay-1">Start Your On-Chain Election</h2>
        <div className="cta-actions animate-in delay-2">
          <button className="btn-primary" onClick={() => navigate("home")}>Go to Voting →</button>
          <button className="btn-secondary" onClick={() => navigate("docs")}>Read the Docs</button>
        </div>
      </section>
    </>
  );
}

/* ═══════════════════════════════════════════
   DOCS PAGE
   ═══════════════════════════════════════════ */
function DocsPage({ navigate }) {
  return (
    <div className="docs-page">
      <div className="section-label animate-in">DOCUMENTATION</div>
      <h2 className="animate-in delay-1">Getting Started with BlockElect</h2>
      <p className="section-desc animate-in delay-2">
        Quick start guide, deployment instructions, and troubleshooting for BlockElect.
      </p>

      <div className="docs-section animate-in delay-3">
        <h3>Quick Start</h3>
        <ol>
          <li>Run a local Hardhat node: <code>npx hardhat node</code></li>
          <li>Deploy the contract: <code>npx hardhat run scripts/deploy.js --network localhost</code></li>
          <li>Start the frontend: <code>cd frontend && npm start</code></li>
          <li>In MetaMask, switch to <strong>Localhost 8545</strong> and connect.</li>
        </ol>
      </div>

      <div className="docs-section animate-in delay-4">
        <h3>How It Works</h3>
        <p>
          The app reads candidates from the <code>Voting</code> smart contract deployed on Ethereum. Registered voters can cast their vote through the frontend interface. Each vote is an on-chain transaction that the smart contract validates before recording. Vote counts are stored immutably in the contract state.
        </p>
      </div>

      <div className="docs-section animate-in delay-5">
        <h3>Smart Contract</h3>
        <p>The <code>Voting.sol</code> contract manages the entire election lifecycle:</p>
        <ul>
          <li>Candidates are initialized at deployment with their names</li>
          <li>Admin can register voter addresses via <code>registerVoter(address)</code></li>
          <li>Voters call <code>vote(candidateIndex)</code> to cast their ballot</li>
          <li>The contract enforces one-vote-per-address and validates registration</li>
          <li>Anyone can read <code>candidates(i)</code> for live vote counts</li>
        </ul>
      </div>

      <div className="docs-section animate-in">
        <h3>Troubleshooting</h3>
        <ul>
          <li><strong><em>could not decode result data (value="0x")</em></strong> — The contract is not deployed on the network MetaMask is connected to. Restart Hardhat and redeploy.</li>
          <li><strong>RPC rate-limit errors</strong> — Use a dedicated RPC provider (Alchemy/Infura) or run a local Hardhat node.</li>
          <li><strong>MetaMask nonce errors</strong> — Reset your MetaMask account (Settings → Advanced → Reset Account) after restarting Hardhat.</li>
        </ul>
      </div>

      <div className="docs-section animate-in">
        <h3>Development Notes</h3>
        <ul>
          <li>The Hardhat local blockchain is <strong>ephemeral</strong> — restarting the node resets all contracts and balances</li>
          <li>The contract must be redeployed after each Hardhat restart</li>
          <li>Voter addresses must be registered on-chain by the admin</li>
          <li>Contract address in the frontend must match the deployed address</li>
        </ul>
      </div>

      <div className="docs-actions animate-in">
        <button className="btn-primary" onClick={() => navigate("home")}>← Back to Home</button>
        <a className="btn-secondary" href="https://hardhat.org" target="_blank" rel="noopener noreferrer">Hardhat Docs ↗</a>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SUCCESS PAGE
   ═══════════════════════════════════════════ */
function SuccessPage({ navigate }) {
  return (
    <div className="success-page">
      <div className="success-card animate-in">
        <div className="success-icon">✅</div>
        <h2>Vote Submitted</h2>
        <p>Thank you — your vote has been recorded on-chain successfully. The transaction is immutable and publicly verifiable.</p>
        <div className="cta-actions">
          <button className="btn-primary" onClick={() => navigate("home")}>Back to Home</button>
        </div>
      </div>
    </div>
  );
}

export default App;