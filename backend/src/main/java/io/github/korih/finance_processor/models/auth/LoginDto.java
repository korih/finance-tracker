package io.github.korih.finance_processor.models.auth;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginDto {
  private String email;
  private String password;
}
