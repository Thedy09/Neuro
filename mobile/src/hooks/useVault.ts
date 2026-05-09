import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vaultApi } from "../services/api";
import { useWalletStore } from "../store/walletStore";

export function useVault() {
  const { address } = useWalletStore();

  return useQuery({
    queryKey: ["vault", address],
    queryFn: () => vaultApi.getVault(address!),
    enabled: !!address,
    staleTime: 30_000,
  });
}

export function useInitializeVault() {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();

  return useMutation({
    mutationFn: (riskScore: number) =>
      vaultApi.initializeVault({
        owner_pubkey: address!,
        risk_score: riskScore,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", address] });
    },
  });
}

export function useUpdateRisk() {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();

  return useMutation({
    mutationFn: (newScore: number) =>
      vaultApi.updateRisk({
        owner_pubkey: address!,
        new_score: newScore,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", address] });
    },
  });
}

export function useDeposit() {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();

  return useMutation({
    mutationFn: (amount: number) =>
      vaultApi.deposit({
        owner_pubkey: address!,
        amount,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", address] });
    },
  });
}
