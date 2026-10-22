import { useState } from "react";
import {
  User,
  Mail,
  AtSign,
  Pencil,
  Save,
  X,
} from "lucide-react";

export default function Profile({ user }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    username: user?.username || "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      username: user?.username || "",
    });

    setIsEditing(false);
  };

  const handleSave = async () => {
    
    const storedUser = JSON.parse(
      sessionStorage.getItem("user") || "{}"
    );

    // Mag support ni both "id" and MongoDB's "_id"
    const userId =
      user?.id ||
      user?._id ||
      storedUser?.id ||
      storedUser?._id;

    if (!userId) {
      console.error("User ID is missing:", user);
      alert("Unable to update profile. User ID is missing.");
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(
        `http://localhost:5000/api/users/${userId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            username: formData.username.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to update profile.");
        return;
      }

      const updatedUser = data.user;

      // e make sure niya nga ang updated user always has "id"
      const normalizedUser = {
        ...updatedUser,
        id: updatedUser.id || updatedUser._id,
      };

      // Update session storage
      sessionStorage.setItem(
        "user",
        JSON.stringify(normalizedUser)
      );

      // Tell Header and Sidebar that user data changed
      window.dispatchEvent(
        new CustomEvent("userUpdated", {
          detail: normalizedUser,
        })
      );

      // Update form with latest data
      setFormData({
        firstName: normalizedUser.firstName || "",
        lastName: normalizedUser.lastName || "",
        email: normalizedUser.email || "",
        username: normalizedUser.username || "",
      });

      
      setIsEditing(false);

      console.log(
        "Profile successfully updated:",
        normalizedUser
      );
    } catch (error) {
      console.error("Profile update error:", error);

      alert(
        "Unable to update profile. Please check if the server is running."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const initials = `${formData.firstName?.[0] || "C"}${
    formData.lastName?.[0] || ""
  }`.toUpperCase();

  return (
    <div className="space-y-5">

      {/* Profile Header */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-4">

            {/* Avatar */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#2F9E7A] text-xl font-bold text-white">
              {initials}
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#0B3B2A]">
                {formData.firstName || "Customer"}{" "}
                {formData.lastName}
              </h2>

              <p className="text-sm text-[#6F8E7F]">
                Customer Profile
              </p>
            </div>

          </div>

          {!isEditing && (
            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B4A2E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#09391F]"
            >
              <Pencil className="h-4 w-4" />
              Edit Profile
            </button>
          )}

        </div>
      </div>

      {/* Personal Information */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">

        <div className="mb-5">
          <h3 className="text-lg font-bold text-[#0B3B2A]">
            Personal Information
          </h3>

          <p className="mt-1 text-sm text-[#6F8E7F]">
            View and manage your account information.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">

          {/* First Name */}
          <div>
            <label className="mb-2 block text-xs font-medium text-[#4E6B5D]">
              First Name
            </label>

            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F8E7F]" />

              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full rounded-lg border border-[#DDEAE3] bg-[#F8FBF9] py-2.5 pl-10 pr-3 text-sm text-[#16352A] outline-none transition focus:border-[#0B4A2E] disabled:cursor-not-allowed disabled:text-[#6F8E7F]"
              />
            </div>
          </div>

          {/* Last Name */}
          <div>
            <label className="mb-2 block text-xs font-medium text-[#4E6B5D]">
              Last Name
            </label>

            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F8E7F]" />

              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full rounded-lg border border-[#DDEAE3] bg-[#F8FBF9] py-2.5 pl-10 pr-3 text-sm text-[#16352A] outline-none transition focus:border-[#0B4A2E] disabled:cursor-not-allowed disabled:text-[#6F8E7F]"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="mb-2 block text-xs font-medium text-[#4E6B5D]">
              Email
            </label>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F8E7F]" />

              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-[#DDEAE3] bg-[#F1F5F3] py-2.5 pl-10 pr-3 text-sm text-[#6F8E7F]"
              />
            </div>

            <p className="mt-1 text-[11px] text-[#8A9C93]">
              Email cannot be changed.
            </p>
          </div>

          {/* Username */}
          <div>
            <label className="mb-2 block text-xs font-medium text-[#4E6B5D]">
              Username
            </label>

            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F8E7F]" />

              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full rounded-lg border border-[#DDEAE3] bg-[#F8FBF9] py-2.5 pl-10 pr-3 text-sm text-[#16352A] outline-none transition focus:border-[#0B4A2E] disabled:cursor-not-allowed disabled:text-[#6F8E7F]"
              />
            </div>
          </div>

        </div>

        {/* Save and Cancel Buttons */}
        {isEditing && (
          <div className="mt-6 flex justify-end gap-3 border-t border-[#E4EFE9] pt-5">

            {/* Cancel */}
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg border border-[#DDEAE3] px-4 py-2.5 text-sm font-medium text-[#4E6B5D] transition hover:bg-[#F5FAF7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>

            {/* Save */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0B4A2E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#09391F] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>

          </div>
        )}

      </div>
    </div>
  );
}