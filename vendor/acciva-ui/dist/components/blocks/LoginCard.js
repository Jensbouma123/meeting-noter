"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Alert } from "../ui/Alert.js";
import { Button } from "../ui/Button/index.js";
import { Card } from "../ui/Card/index.js";
import { Divider } from "../ui/Divider.js";
import { Heading } from "../ui/Heading/index.js";
import { Input } from "../ui/Input/index.js";
import { PasswordField } from "../ui/PasswordField/index.js";
import { SocialButton } from "../ui/SocialButton/index.js";
import { Text } from "../ui/Text.js";
import { VStack } from "../ui/VStack.js";
import { cn } from "../../lib/utils.js";
export function LoginCard({ title = "Sign in", description, onSubmit, providers, onProviderClick, error, loading = false, submitLabel = "Sign in", footer, className, }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const handleSubmit = (event) => {
        event.preventDefault();
        onSubmit({ email, password });
    };
    return (_jsx(Card, { padding: "lg", className: cn("w-full max-w-md", className), children: _jsxs(VStack, { spacing: "lg", children: [_jsxs(VStack, { spacing: "xs", children: [_jsx(Heading, { level: 2, size: "xl", children: title }), description ? (_jsx(Text, { size: "sm", variant: "muted", children: description })) : null] }), error ? _jsx(Alert, { variant: "danger", children: error }) : null, providers && providers.length > 0 ? (_jsxs(_Fragment, { children: [_jsx(VStack, { spacing: "sm", children: providers.map((provider) => (_jsx(SocialButton, { provider: provider, variant: "outline", fullWidth: true, onClick: () => onProviderClick?.(provider) }, provider))) }), _jsx(Text, { as: "div", size: "xs", variant: "muted", align: "center", children: "or continue with email" })] })) : null, _jsx("form", { onSubmit: handleSubmit, noValidate: true, children: _jsxs(VStack, { spacing: "md", children: [_jsx(Input, { label: "Email", type: "email", name: "email", autoComplete: "email", required: true, value: email, onChange: (event) => setEmail(event.target.value) }), _jsx(PasswordField, { label: "Password", name: "password", mode: "login", required: true, value: password, onChange: (event) => setPassword(event.target.value) }), _jsx(Button, { type: "submit", size: "lg", loading: loading, className: "w-full", children: submitLabel })] }) }), footer ? (_jsxs(_Fragment, { children: [_jsx(Divider, {}), _jsx(Text, { as: "div", size: "sm", variant: "muted", align: "center", children: footer })] })) : null] }) }));
}
