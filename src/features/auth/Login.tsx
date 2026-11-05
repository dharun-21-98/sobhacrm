import { Brand } from "../../components/Brand";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  ShieldCheck,
  Users,
  UserRound,
} from "lucide-react";
import { users, roleName, reportingRms, type Role } from "../../data/users";
import { useStore } from "../../data/repo";
import { useSession } from "./session";
import { allowedPath } from "../../data/access";
export function Login() {
  const [role, setRole] = useState<Role | null>(null),
    [id, setId] = useState("");
  const { login } = useSession();
  const { db, setUser } = useStore();
  const nav = useNavigate();
  const location = useLocation();
  const cards = [
    {
      role: "RM" as Role,
      icon: UserRound,
      text: "Your customers. Your next steps. Manage every relationship in one connected workspace.",
    },
    {
      role: "TL" as Role,
      icon: Users,
      text: "See your team clearly. Guide follow-ups, monitor portfolios and keep progress moving.",
    },
    {
      role: "Leadership" as Role,
      icon: Building2,
      text: "The enterprise perspective. Explore performance, insights and opportunities across teams.",
    },
  ];
  return (
    <div className="login-page">
      <div className="login-story">
        <Brand />
        <div className="login-story-content">
          <div className="eyebrow">RELATIONSHIPS THAT BUILD THE FUTURE</div>
          <h1>
            Every relationship.
            <br />A stronger foundation.
          </h1>
          <p>One connected platform for customers, teams and leadership.</p>
          <div className="login-architecture">
            <Building2 size={220} />
            <Building2 size={150} />
            <Building2 size={110} />
          </div>
        </div>
        <footer>RELATIONSHIP MANAGEMENT PLATFORM</footer>
      </div>
      <div className="login-content">
        <div className="login-top">
          <span>WELCOME TO YOUR WORKSPACE</span>
          <span className="chip">Demo login</span>
        </div>
        <h1>Choose your perspective</h1>
        <p className="muted">
          Select a persona and user to explore the Sobha platform.
        </p>
        <div className="persona-cards">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.role}
                aria-pressed={role === card.role}
                className={`persona-card ${role === card.role ? "chosen" : ""}`}
                onClick={() => {
                  setRole(card.role);
                  setId("");
                }}
              >
                <span className="persona-icon">
                  <Icon size={23} />
                </span>
                <div>
                  <h2>{roleName(card.role)}</h2>
                  <p>{card.text}</p>
                </div>
                <span className="persona-radio">
                  {role === card.role ? "●" : ""}
                </span>
              </button>
            );
          })}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!role || !id) return;
            login(id, role);
            setUser(id);
            const requested =
              typeof location.state?.from === "string"
                ? location.state.from
                : "/workspace";
            nav(allowedPath(db, id, requested) ? requested : "/workspace", {
              replace: true,
            });
          }}
        >
          <label>
            Demo user
            <select
              aria-label="Demo user"
              required
              disabled={!role}
              value={id}
              onChange={(e) => setId(e.target.value)}
            >
              <option value="">
                {role ? "Select a user" : "Select a persona first"}
              </option>
              {users
                .filter((user) => user.role === role)
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} · {user.team}
                    {user.role === "TL"
                      ? ` · ${reportingRms(user.id).length} RMs`
                      : ""}
                  </option>
                ))}
            </select>
          </label>
          <button className="primary full login-submit" disabled={!role || !id}>
            Login to workspace <ArrowRight size={17} />
          </button>
        </form>
        <div className="login-note">
          <ShieldCheck size={18} />
          <span>
            Demo identities only. All business data and services are simulated;
            no password is required.
          </span>
        </div>
      </div>
    </div>
  );
}
