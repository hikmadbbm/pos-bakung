"use client";
import { useState } from "react";
import { api, setAuth } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Logo from "../../media/Logo.png";
import PostLoginModal from "../../components/PostLoginModal";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api.post("/auth/login", { username, password });
      setAuth(data.token, data.user);
      setCurrentUser(data.user);
      setShowModal(true);
    } catch (err) {
      console.error("Login error:", err);
      let errorMessage = "Login failed. Please check your credentials.";
      
      if (err.response) {
        // Server responded with a status code outside 2xx
        if (err.response.data && err.response.data.error) {
          errorMessage = err.response.data.error;
        } else {
          errorMessage = `Login failed (Status: ${err.response.status})`;
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = "Unable to connect to the server. Please check your internet connection.";
      } else {
        // Something happened in setting up the request
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    } finally {
      if (!showModal) setLoading(false);
    }
  };

  const seedOwner = async () => {
    try {
      await api.post("/auth/seed-owner", {
        name: "Owner",
        username: "owner",
        email: "owner@example.com",
        password: "password"
      });
      alert("Owner seeded! Username: owner, Pass: password");
    } catch (e) {
      alert(e.response?.data?.error || "Failed to seed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="relative w-24 h-24 mb-4">
            <Image src={Logo} alt="Bakmie You-Tje" fill className="object-contain" sizes="96px" priority />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-blue-600">Bakmie You-Tje</CardTitle>
          <CardDescription className="text-center">
            Powered by Bakung Studio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-red-500 text-sm text-center">{error}</div>}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              First time?{" "}
              <button onClick={seedOwner} className="text-blue-600 hover:underline">
                Click here to seed default owner
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
      
      {showModal && (
        <PostLoginModal 
          isOpen={showModal} 
          user={currentUser} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </div>
  );
}
